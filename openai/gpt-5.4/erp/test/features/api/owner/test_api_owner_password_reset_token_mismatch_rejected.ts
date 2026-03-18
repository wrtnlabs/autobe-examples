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

export async function test_api_owner_password_reset_token_mismatch_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(owner);
  const guestConnection: api.IConnection = { host: connection.host };
  const passwordReset =
    await generate_random_hrm_time_tracking_owner_password_resets_create(
      guestConnection,
      {
        body: {
          actor: "owner",
          email: owner.email,
        } satisfies IHrmTimeTrackingOwnerPasswordReset.ICreate,
      },
    );
  typia.assert(passwordReset);
  const updateBody = {
    token: `token-mismatch-${RandomGenerator.alphaNumeric(32)}`,
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IHrmTimeTrackingOwnerPasswordReset.IUpdate;
  await TestValidator.error(
    "reject mismatched password reset token",
    async () => {
      await api.functional.hrmTimeTracking.owner.password_resets.update(
        guestConnection,
        {
          passwordResetId: passwordReset.id,
          body: updateBody,
        },
      );
    },
  );
}
