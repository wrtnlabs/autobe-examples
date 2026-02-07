import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_activation_status_toggle(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create a regular administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAccount);
  
  // First, get the current administrator record to capture initial timestamp
  const initialAdminRecord = await api.functional.discussionBoard.superAdmin.administrators.update(
    superAdminConnection,
    {
      administratorId: adminAccount.id,
      body: {
        is_active: true,
      } satisfies IDiscussionBoardAdministratorPromotionApproval.IUpdate,
    },
  );
  typia.assert(initialAdminRecord);
  
  // Store initial timestamps for comparison
  const initialUpdateTime = initialAdminRecord.updated_at;
  
  // Deactivate the administrator
  const deactivatedAdmin =
    await api.functional.discussionBoard.superAdmin.administrators.update(
      superAdminConnection,
      {
        administratorId: adminAccount.id,
        body: {
          is_active: false,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IUpdate,
      },
    );
  typia.assert(deactivatedAdmin);
  // Verify deactivation
  TestValidator.equals(
    "admin should be deactivated",
    deactivatedAdmin.is_active,
    false,
  );
  TestValidator.notEquals(
    "updated_at should change after deactivation",
    deactivatedAdmin.updated_at,
    initialUpdateTime,
  );
  // Reactivate the administrator
  const reactivatedAdmin =
    await api.functional.discussionBoard.superAdmin.administrators.update(
      superAdminConnection,
      {
        administratorId: adminAccount.id,
        body: {
          is_active: true,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IUpdate,
      },
    );
  typia.assert(reactivatedAdmin);
  // Verify reactivation
  TestValidator.equals(
    "admin should be reactivated",
    reactivatedAdmin.is_active,
    true,
  );
  TestValidator.notEquals(
    "updated_at should change after reactivation",
    reactivatedAdmin.updated_at,
    deactivatedAdmin.updated_at,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    reactivatedAdmin.created_at,
    deactivatedAdmin.created_at,
  );
  TestValidator.equals(
    "promoted_at should remain unchanged",
    reactivatedAdmin.promoted_at,
    deactivatedAdmin.promoted_at,
  );
  TestValidator.equals(
    "grade should remain unchanged",
    reactivatedAdmin.grade,
    deactivatedAdmin.grade,
  );
  TestValidator.equals(
    "user ID should remain unchanged",
    reactivatedAdmin.user.id,
    deactivatedAdmin.user.id,
  );
}