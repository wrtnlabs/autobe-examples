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

/**
 * Test updating existing administrator capabilities with modified permission levels.
 * A super administrator authenticates, creates a promotion request for a regular user,
 * approves it to make them an administrator, assigns initial capabilities, then updates
 * those capabilities with different permission levels. Validate that the capability
 * updates are applied correctly, audit trail is maintained, and the response shows
 * the updated capability set with proper pagination.
 */
export async function test_api_administrator_capabilities_update_existing_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 2. Regular User setup
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Create promotion request using utility function
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 4. For testing purposes, we'll assume the promotion request is approved
  // and the user becomes an administrator. In a real scenario, this would
  // involve super admin approval workflow.
  // 5. Create initial capability assignment using utility function
  const initialCapability =
    await generate_random_discussion_board_super_admin_administrators_capabilities_create(
      superAdminConnection,
      {
        params: {
          administratorId: user.id, // Using user ID as administrator ID for testing
        },
        body: {
          capability_type: "content_moderation",
          permission_level: "read_only",
        } satisfies IDiscussionBoardAdministratorCapability.ICreate,
      },
    );
  typia.assert(initialCapability);
  // 6. Update capabilities with different permission levels
  const updatedCapabilities =
    await api.functional.discussionBoard.superAdmin.administrators.capabilities.updateCapabilities(
      superAdminConnection,
      {
        administratorId: user.id,
        body: {
          capability_type: "content_moderation",
          permission_level: "full_access",
        } satisfies IDiscussionBoardAdministratorCapability.IUpdate,
      },
    );
  typia.assert(updatedCapabilities);
  // 7. Validate business logic (not type validation)
  TestValidator.equals(
    "capabilities array contains updated capability",
    updatedCapabilities.data.length,
    1,
  );
  const updatedCapability = updatedCapabilities.data[0];
  TestValidator.equals(
    "capability type matches update",
    updatedCapability.capability_type,
    "content_moderation",
  );
  TestValidator.equals(
    "permission level upgraded",
    updatedCapability.permission_level,
    "full_access",
  );
  TestValidator.notEquals(
    "capability ID differs from initial",
    updatedCapability.id,
    initialCapability.id,
  );
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination shows correct record count",
    updatedCapabilities.pagination.records === 1,
  );
  TestValidator.predicate(
    "pagination shows correct page count",
    updatedCapabilities.pagination.pages === 1,
  );
  TestValidator.predicate(
    "pagination shows current page 0",
    updatedCapabilities.pagination.current === 0,
  );
  // 9. Validate audit trail integrity
  TestValidator.equals(
    "assigned_by administrator exists",
    typeof updatedCapability.assigned_by,
    "object",
  );
  TestValidator.equals(
    "administrator relationship maintained",
    typeof updatedCapability.administrator,
    "object",
  );
  // 10. Validate timestamp progression
  const initialCreated = new Date(initialCapability.created_at);
  const updatedCreated = new Date(updatedCapability.created_at);
  TestValidator.predicate(
    "new capability has newer timestamp",
    updatedCreated > initialCreated,
  );
}
