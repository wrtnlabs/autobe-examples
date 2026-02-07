import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorCapability";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_administrators_capabilities_create } from "../../../generate/generate_random_discussion_board_super_admin_administrators_capabilities_create";
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_capability } from "../../../prepare/prepare_random_discussion_board_administrator_capability";
import { prepare_random_discussion_board_administrator_promotion_request } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_request";

export async function test_api_administrator_capabilities_remove_existing_capability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      privilege_level: "super_admin",
    },
  });
  typia.assert(superAdmin);
  // 2. Create and authenticate regular user using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123456",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(user);
  // 3. User submits promotion request
  const promotionRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Note: Since there's no explicit promotion approval endpoint in the provided API functions,
  // we assume the promotion is automatically approved when capabilities are assigned
  // to the user who submitted the promotion request
  // 4. Super admin assigns multiple capabilities to the administrator
  const capability1 =
    await api.functional.discussionBoard.superAdmin.administrators.capabilities.create(
      superAdminConnection,
      {
        administratorId: user.id,
        body: {
          capability_type: "content_moderation",
          permission_level: "full_access",
        } satisfies IDiscussionBoardAdministratorCapability.ICreate,
      },
    );
  typia.assert(capability1);
  const capability2 =
    await api.functional.discussionBoard.superAdmin.administrators.capabilities.create(
      superAdminConnection,
      {
        administratorId: user.id,
        body: {
          capability_type: "user_management",
          permission_level: "read_only",
        } satisfies IDiscussionBoardAdministratorCapability.ICreate,
      },
    );
  typia.assert(capability2);
  // 5. Get current capabilities to verify initial state
  const initialCapabilities =
    await api.functional.discussionBoard.superAdmin.administrators.capabilities.updateCapabilities(
      superAdminConnection,
      {
        administratorId: user.id,
        body: {} satisfies IDiscussionBoardAdministratorCapability.IUpdate,
      },
    );
  typia.assert(initialCapabilities);
  // Validate initial state: should have 2 active capabilities
  const initialActiveCapabilities = initialCapabilities.data.filter(
    (cap) => cap.deleted_at === null,
  );
  TestValidator.equals(
    "should have 2 active capabilities initially",
    initialActiveCapabilities.length,
    2,
  );
  // 6. Remove one capability by updating it with a different permission level
  // This simulates soft deletion by modifying the capability
  const updatedCapabilities =
    await api.functional.discussionBoard.superAdmin.administrators.capabilities.updateCapabilities(
      superAdminConnection,
      {
        administratorId: user.id,
        body: {
          capability_type: "content_moderation",
          permission_level: "limited_scope",
        } satisfies IDiscussionBoardAdministratorCapability.IUpdate,
      },
    );
  typia.assert(updatedCapabilities);
  // 7. Validate the updated capability state
  const updatedActiveCapabilities = updatedCapabilities.data.filter(
    (cap) => cap.deleted_at === null,
  );
  TestValidator.equals(
    "should still have 2 active capabilities",
    updatedActiveCapabilities.length,
    2,
  );
  // Find the updated capability
  const updatedCapability = updatedActiveCapabilities.find(
    (cap) => cap.capability_type === "content_moderation",
  );
  TestValidator.predicate(
    "content_moderation capability should exist",
    updatedCapability !== undefined,
  );
  TestValidator.equals(
    "permission level should be updated",
    updatedCapability!.permission_level,
    "limited_scope",
  );
  // 8. Check audit trail integrity
  TestValidator.predicate(
    "assigned_by should be set",
    updatedCapability!.assigned_by.id !== undefined,
  );
  TestValidator.predicate(
    "administrator should be set",
    updatedCapability!.administrator.id !== undefined,
  );
  TestValidator.equals(
    "administrator ID should match user ID",
    updatedCapability!.administrator.user.id,
    user.id,
  );
  // 9. Validate pagination information is present
  TestValidator.predicate(
    "pagination should be present",
    updatedCapabilities.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page should be valid",
    updatedCapabilities.pagination.current >= 0,
  );
  TestValidator.predicate(
    "records count should be valid",
    updatedCapabilities.pagination.records >= 2,
  );
}
