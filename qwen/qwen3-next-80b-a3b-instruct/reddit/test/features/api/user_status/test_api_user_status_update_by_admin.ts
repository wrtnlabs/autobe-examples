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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_user_status_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin via join (creates admin account)
  const adminUser: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(adminUser);
  // Create test user
  const userConnection: api.IConnection = { host: connection.host };
  const testUser: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(testUser);
  // Update user status to 'banned' with reason
  const updatedStatus: ICommunityBbsUserStatus =
    await api.functional.communityBbs.admin.users.status.update(
      adminConnection,
      {
        userId: testUser.id,
        body: {
          reason:
            "Violated community guidelines" satisfies ICommunityBbsUserStatus.IUpdate["reason"],
        },
      },
    );
  typia.assert(updatedStatus);
  // Validate that status was updated to 'banned'
  TestValidator.equals(
    "status should be banned",
    updatedStatus.status,
    "banned",
  );
  // Validate that reason was properly recorded
  TestValidator.equals(
    "reason should match",
    updatedStatus.reason,
    "Violated community guidelines",
  );
  // Validate that actor is admin and actor_id matches admin's ID
  TestValidator.equals(
    "actor_type should be admin",
    updatedStatus.actor_type,
    "admin",
  );
  TestValidator.equals(
    "actor_id should match admin ID",
    updatedStatus.actor_id,
    adminUser.id,
  );
  // Validate that performed_by matches admin's ID
  TestValidator.equals(
    "performed_by should match admin ID",
    updatedStatus.performed_by,
    adminUser.id,
  );
  // Verify that created_at and updated_at are present and in ISO format
  TestValidator.predicate("created_at should be valid date-time", () => {
    const date = new Date(updatedStatus.created_at);
    return (
      !isNaN(date.getTime()) && date.toISOString() === updatedStatus.created_at
    );
  });
  TestValidator.predicate("updated_at should be valid date-time", () => {
    const date = new Date(updatedStatus.updated_at);
    return (
      !isNaN(date.getTime()) && date.toISOString() === updatedStatus.updated_at
    );
  });
}
