import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatus";
import { prepare_random_community_bbs_user_status } from "../../../prepare/prepare_random_community_bbs_user_status";
import { generate_random_community_bbs_admin_users_status_create } from "../../../generate/generate_random_community_bbs_admin_users_status_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_user_status_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using utility function (mandatory)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(adminAuthResult);
  // Step 2: Define the status value we want to test
  const targetStatus = RandomGenerator.pick([
    "active",
    "suspended",
    "banned",
    "pending_deletion",
    "restricted",
  ] as const);
  // Step 3: Update the admin's status using the generation function (mandatory)
  // We use the generation function because it exists for this endpoint
  const updatedStatus =
    await generate_random_community_bbs_admin_users_status_create(
      adminConnection,
      {
        body: {
          status: targetStatus,
        } satisfies ICommunityBbsUserStatus.ICreate,
      },
    );
  typia.assert(updatedStatus);
  // Step 4: Validate the status update response
  // Only validate business logic - type validation is already handled by typia.assert
  TestValidator.equals(
    "status matches what was sent",
    updatedStatus.status,
    targetStatus,
  );
  TestValidator.equals(
    "actor_type is admin",
    updatedStatus.actor_type,
    "admin",
  );
  TestValidator.equals(
    "actor_id matches admin id",
    updatedStatus.actor_id,
    adminAuthResult.id,
  );
  TestValidator.equals(
    "performed_by matches admin id",
    updatedStatus.performed_by,
    adminAuthResult.id,
  );
}