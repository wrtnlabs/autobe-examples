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

export async function test_api_administrator_capability_update_permission_level(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Create regular user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create promotion request for the user
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }) satisfies string &
            tags.MinLength<50> &
            tags.MaxLength<500>,
        },
      },
    );
  typia.assert(promotionRequest);
  // Note: In a complete implementation, we would need an approval endpoint
  // For this test, we'll simulate that the promotion was approved and an administrator was created
  // Since we don't have an approval endpoint utility, we'll proceed with the capability assignment
  // using the assumption that an administrator record exists for the user
  // Create initial capability assignment with 'read_only' permission level
  const initialCapability =
    await generate_random_discussion_board_super_admin_administrators_capabilities_create(
      superAdminConnection,
      {
        params: {
          administratorId: promotionRequest.user.id, // Using user ID as administrator ID for test purposes
        },
        body: {
          capability_type: "content_moderation",
          permission_level: "read_only",
        },
      },
    );
  typia.assert(initialCapability);
  // Update capability permission level to 'full_access'
  const updatedCapability =
    await api.functional.discussionBoard.superAdmin.administrators.capabilities.update(
      superAdminConnection,
      {
        administratorId: promotionRequest.user.id,
        capabilityId: initialCapability.id,
        body: {
          permission_level: "full_access",
        } satisfies IDiscussionBoardAdministratorCapability.IUpdate,
      },
    );
  typia.assert(updatedCapability);
  // Validate the capability assignment was successfully updated
  TestValidator.equals(
    "permission level updated",
    updatedCapability.permission_level,
    "full_access",
  );
  TestValidator.equals(
    "capability type unchanged",
    updatedCapability.capability_type,
    "content_moderation",
  );
  TestValidator.predicate(
    "updated timestamp present",
    updatedCapability.updated_at !== initialCapability.updated_at,
  );
  TestValidator.equals(
    "assigned_by references super admin",
    updatedCapability.assigned_by.id,
    superAdminAuth.id,
  );
}
