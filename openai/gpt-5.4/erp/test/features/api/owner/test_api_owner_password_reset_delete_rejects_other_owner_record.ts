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

export async function test_api_owner_password_reset_delete_rejects_other_owner_record(
  connection: api.IConnection,
): Promise<void> {
  const firstOwnerConnection: api.IConnection = { host: connection.host };
  const firstOwnerEmail = typia.random<string & tags.Format<"email">>();
  const firstOwnerJoin = await authorize_owner_join(firstOwnerConnection, {
    body: {
      email: firstOwnerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstOwnerJoin);
  const protectedReset =
    await generate_random_hrm_time_tracking_owner_password_resets_create(
      firstOwnerConnection,
      {
        body: {
          actor: "owner",
          email: firstOwnerEmail,
        },
      },
    );
  typia.assert(protectedReset);
  TestValidator.equals(
    "password reset belongs to owner actor type",
    protectedReset.actorType,
    "owner",
  );
  TestValidator.equals(
    "password reset starts unused",
    protectedReset.used_at,
    null,
  );
  TestValidator.equals(
    "password reset starts undeleted",
    protectedReset.deleted_at,
    null,
  );
  const secondOwnerConnection: api.IConnection = { host: connection.host };
  const secondOwnerJoin = await authorize_owner_join(secondOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondOwnerJoin);
  TestValidator.notEquals(
    "owners are distinct",
    secondOwnerJoin.id,
    firstOwnerJoin.id,
  );
  await TestValidator.httpError(
    "other owner cannot delete protected password reset",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.owner.password_resets.erase(
        secondOwnerConnection,
        {
          passwordResetId: protectedReset.id,
        },
      );
    },
  );
  await api.functional.hrmTimeTracking.owner.password_resets.erase(
    firstOwnerConnection,
    {
      passwordResetId: protectedReset.id,
    },
  );
}
