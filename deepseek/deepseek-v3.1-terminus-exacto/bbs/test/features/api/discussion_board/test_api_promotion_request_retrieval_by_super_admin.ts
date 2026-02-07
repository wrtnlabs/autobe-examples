import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_promotion_request } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_request";

/**
 * Test the retrieval of a specific administrator promotion request by a super administrator.
 * This scenario validates that super administrators can access detailed promotion request
 * information including the requesting user's profile, justification reason, current status,
 * and review history.
 */
export async function test_api_promotion_request_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a regular user account first
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(userJoin);
  // Authenticate the user
  await authorize_user_login(userConnection, {
    body: {
      email: userJoin.email,
      password: RandomGenerator.alphaNumeric(16), // Use the same password used for join
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // Create a super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  // Authenticate the admin
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: RandomGenerator.alphaNumeric(16), // Use the same password used for join
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Submit a promotion request with valid justification text (50-500 characters)
  const reasonText = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 6,
    wordMax: 10,
  });
  // Ensure the reason meets the minimum length requirement
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: reasonText,
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Retrieve the promotion request using the super administrator's connection
  const retrievedRequest =
    await api.functional.discussionBoard.admin.promotion_requests.at(
      adminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate all fields in the response match the expected structure and values
  TestValidator.equals(
    "promotion request ID",
    retrievedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "reason text",
    retrievedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.equals(
    "status should be pending",
    retrievedRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "created_at should be set",
    retrievedRequest.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at should be set",
    retrievedRequest.updated_at !== null,
  );
  TestValidator.equals(
    "approved_at should be null",
    retrievedRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "rejected_at should be null",
    retrievedRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "reviewer_notes should be null",
    retrievedRequest.reviewer_notes,
    null,
  );
  // Validate user information
  TestValidator.equals("user id", retrievedRequest.user.id, userJoin.id);
  TestValidator.equals(
    "user display_name",
    retrievedRequest.user.display_name,
    userJoin.display_name,
  );
  TestValidator.equals("user bio", retrievedRequest.user.bio, userJoin.bio);
  // Validate reviewer and administrator fields are null for pending requests
  TestValidator.equals(
    "reviewer should be null",
    retrievedRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "administrator should be null",
    retrievedRequest.administrator,
    null,
  );
}
