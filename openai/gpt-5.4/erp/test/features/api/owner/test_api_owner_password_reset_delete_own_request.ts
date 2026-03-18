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

export async function test_api_owner_password_reset_delete_own_request(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const owner = await authorize_owner_join(ownerConnection, {
    body: joinBody,
  });
  typia.assert(owner);
  const ownerSnapshot = {
    id: owner.id,
    email: owner.email,
    last_login_at: owner.last_login_at,
    deactivated_at: owner.deactivated_at,
    created_at: owner.created_at,
    updated_at: owner.updated_at,
    deleted_at: owner.deleted_at,
    token: owner.token,
  } satisfies IHrmTimeTrackingOwner.IAuthorized;
  const passwordReset =
    await generate_random_hrm_time_tracking_owner_password_resets_create(
      ownerConnection,
      {
        body: {
          actor: "owner",
          email: owner.email,
        } satisfies IHrmTimeTrackingOwnerPasswordReset.ICreate,
      },
    );
  typia.assert(passwordReset);
  const erased =
    await api.functional.hrmTimeTracking.owner.password_resets.erase(
      ownerConnection,
      {
        passwordResetId: passwordReset.id,
      },
    );
  TestValidator.equals("delete returns no response body", erased, undefined);
  TestValidator.equals(
    "owner account payload remains unchanged after password reset deletion",
    owner,
    ownerSnapshot,
  );
  TestValidator.equals(
    "owner connection authorization header is preserved",
    ownerConnection.headers?.Authorization,
    ownerSnapshot.token.access,
  );
}
