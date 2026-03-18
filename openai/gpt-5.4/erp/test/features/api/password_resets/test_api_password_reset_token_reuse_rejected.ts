import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingOwnerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwnerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_password_resets_create } from "../../../generate/generate_random_hrm_time_tracking_owner_password_resets_create";
import { prepare_random_hrm_time_tracking_owner_password_reset } from "../../../prepare/prepare_random_hrm_time_tracking_owner_password_reset";

export async function test_api_password_reset_token_reuse_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const firstReplacementPassword = RandomGenerator.alphaNumeric(16);
  const secondReplacementPassword = RandomGenerator.alphaNumeric(16);
  const invalidToken = RandomGenerator.alphaNumeric(32);
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const createdReset =
    await generate_random_hrm_time_tracking_owner_password_resets_create(
      ownerConnection,
      {
        body: {
          actor: "owner",
          email: ownerEmail,
        },
      },
    );
  typia.assert(createdReset);
  TestValidator.equals(
    "reset actor type is owner",
    createdReset.actorType,
    "owner",
  );
  TestValidator.equals(
    "newly created reset is unused",
    createdReset.used_at,
    null,
  );
  TestValidator.predicate(
    "created reset is not deleted",
    createdReset.deleted_at === null,
  );
  await TestValidator.error(
    "first reset attempt with unavailable token is rejected",
    async () => {
      await api.functional.hrmTimeTracking.owner.password_resets.resetPassword(
        ownerConnection,
        {
          body: {
            actor: "owner",
            token: invalidToken,
            password: firstReplacementPassword,
          },
        },
      );
    },
  );
  await TestValidator.error(
    "second reset attempt reusing same unavailable token is rejected",
    async () => {
      await api.functional.hrmTimeTracking.owner.password_resets.resetPassword(
        ownerConnection,
        {
          body: {
            actor: "owner",
            token: invalidToken,
            password: secondReplacementPassword,
          },
        },
      );
    },
  );
  TestValidator.equals(
    "reset record remains unused after failed attempts",
    createdReset.used_at,
    null,
  );
  TestValidator.equals(
    "reset record actor type remains owner after failed attempts",
    createdReset.actorType,
    "owner",
  );
}
