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

export async function test_api_promotion_requests_superadmin_view_rejected_request(
  connection: api.IConnection,
): Promise<void> {
  // Create a regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(user);
  // Submit a promotion request with sufficient length
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 8,
            wordMin: 5,
            wordMax: 8,
          }),
        },
      },
    );
  typia.assert(promotionRequest);
  // Authenticate as existing super administrator (using predefined credentials)
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "superadmin123",
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Reject the promotion request with review notes
  const reviewNotes = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedRequest =
    await api.functional.discussionBoard.superAdmin.review(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          approved: false,
          notes: reviewNotes,
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IReview,
      },
    );
  typia.assert(rejectedRequest);
  // Retrieve the rejected request
  const retrievedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.at(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate rejection details
  TestValidator.equals(
    "status should be rejected",
    retrievedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejected_at should be set",
    retrievedRequest.rejected_at !== null,
  );
  TestValidator.equals(
    "reviewer_notes should match",
    retrievedRequest.reviewer_notes,
    reviewNotes,
  );
  TestValidator.equals(
    "approved_at should be null",
    retrievedRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "administrator should be null",
    retrievedRequest.administrator,
    null,
  );
  TestValidator.predicate(
    "reviewer should be assigned",
    retrievedRequest.reviewer !== null,
  );
  TestValidator.equals(
    "user id should match",
    retrievedRequest.user.id,
    user.id,
  );
  TestValidator.predicate(
    "rejected timestamp should be after creation",
    new Date(retrievedRequest.rejected_at!) >
      new Date(retrievedRequest.created_at),
  );
}
