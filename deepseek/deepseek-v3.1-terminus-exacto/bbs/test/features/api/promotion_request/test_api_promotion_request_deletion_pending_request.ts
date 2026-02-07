import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_promotion_request } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_request";

/**
 * Test the successful deletion of a pending promotion request by a super administrator.
 *
 * This test validates the complete workflow of promotion request deletion:
 * 1. Regular user creates account and submits promotion request
 * 2. Super administrator authenticates and deletes the pending request
 * 3. Verifies the deletion operation returns the complete request record
 * 4. Ensures only pending requests can be deleted
 */
export async function test_api_promotion_request_deletion_pending_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123456",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Submit promotion request with valid reason text
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 8,
            wordMin: 8,
            wordMax: 12,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "promotion request status",
    promotionRequest.status,
    "pending",
  );
  // 3. Create super administrator account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SuperAdmin123!",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 4. Delete the pending promotion request
  const deletedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.erase(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(deletedRequest);
  // 5. Validate the deleted request record
  TestValidator.equals(
    "deleted request ID",
    deletedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "deleted request reason",
    deletedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.equals(
    "deleted request status",
    deletedRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "approved_at should be null",
    deletedRequest.approved_at === null,
  );
  TestValidator.predicate(
    "rejected_at should be null",
    deletedRequest.rejected_at === null,
  );
  TestValidator.predicate(
    "reviewer should be null",
    deletedRequest.reviewer === null,
  );
  TestValidator.predicate(
    "administrator should be null",
    deletedRequest.administrator === null,
  );
  // 6. Validate audit trail information
  TestValidator.equals(
    "user ID preserved",
    deletedRequest.user.id,
    promotionRequest.user.id,
  );
  TestValidator.equals(
    "user display name preserved",
    deletedRequest.user.display_name,
    promotionRequest.user.display_name,
  );
  TestValidator.predicate(
    "created_at preserved",
    deletedRequest.created_at === promotionRequest.created_at,
  );
  TestValidator.predicate(
    "updated_at preserved",
    deletedRequest.updated_at === promotionRequest.updated_at,
  );
}
