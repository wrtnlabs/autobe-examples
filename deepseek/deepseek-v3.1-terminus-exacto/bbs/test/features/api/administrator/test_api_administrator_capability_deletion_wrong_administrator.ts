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
 * Test deletion attempt for a capability assignment that belongs to a different administrator.
 *
 * Creates two administrators with capabilities, then attempts to delete one administrator's
 * capability using the other administrator's ID. Validates that the system returns an error
 * indicating the capability assignment doesn't belong to the specified administrator.
 */
export async function test_api_administrator_capability_deletion_wrong_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "super_admin_password_123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create first user and promote to administrator
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Submit and approve promotion request for user1
  const promotionRequest1 =
    await generate_random_discussion_board_user_promotion_requests_create(
      user1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 10,
            wordMax: 15,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  // Create second user and promote to administrator
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Submit and approve promotion request for user2
  const promotionRequest2 =
    await generate_random_discussion_board_user_promotion_requests_create(
      user2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 10,
            wordMax: 15,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  // Assign capabilities to both administrators
  const capability1 =
    await generate_random_discussion_board_super_admin_administrators_capabilities_create(
      superAdminConnection,
      {
        params: { administratorId: promotionRequest1.id },
        body: {
          capability_type: "content_moderation",
          permission_level: "full_access",
        } satisfies IDiscussionBoardAdministratorCapability.ICreate,
      },
    );
  const capability2 =
    await generate_random_discussion_board_super_admin_administrators_capabilities_create(
      superAdminConnection,
      {
        params: { administratorId: promotionRequest2.id },
        body: {
          capability_type: "user_management",
          permission_level: "read_only",
        } satisfies IDiscussionBoardAdministratorCapability.ICreate,
      },
    );
  // Attempt to delete Administrator 1's capability using Administrator 2's ID
  // This should fail because the capability belongs to Administrator 1
  await TestValidator.error(
    "should fail when deleting capability with wrong administrator ID",
    async () => {
      await api.functional.discussionBoard.superAdmin.administrators.capabilities.erase(
        superAdminConnection,
        {
          administratorId: promotionRequest2.id, // Wrong administrator ID
          capabilityId: capability1.id, // Capability belongs to Administrator 1
        },
      );
    },
  );
}
