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
 * Test the rejection of an administrator promotion request without explanatory notes.
 * A regular user submits a promotion request. A super administrator authenticates
 * and reviews the request, rejecting it without providing additional notes.
 * The system should update the promotion request status to 'rejected', set the
 * rejected_at timestamp, and maintain the user as a regular user without creating
 * an administrator assignment.
 */
export async function test_api_superadmin_promotion_request_rejection_without_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular user account
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 2. Submit a promotion request from the regular user
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 6,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 3. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 4. Reject the promotion request without notes
  const reviewBody = {
    approved: false,
    notes: null,
  } satisfies IDiscussionBoardAdministratorPromotionRequest.IReview;
  const rejectedRequest =
    await api.functional.discussionBoard.superAdmin.review(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: reviewBody,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Validate the rejection
  TestValidator.equals(
    "status should be rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.notEquals(
    "rejected_at should be set",
    rejectedRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "approved_at should be null",
    rejectedRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "reviewer_notes should be null",
    rejectedRequest.reviewer_notes,
    null,
  );
  TestValidator.equals(
    "administrator should be null",
    rejectedRequest.administrator,
    null,
  );
  TestValidator.notEquals(
    "reviewer should be set",
    rejectedRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "user should remain the same",
    rejectedRequest.user.id,
    promotionRequest.user.id,
  );
}
