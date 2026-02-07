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
 * Test error handling when attempting to process a promotion request
 * that has already been decided. Creates a promotion request, processes
 * it (approve or reject), then attempts to process it again with a
 * different decision. Validates that the system returns an appropriate
 * error indicating the request has already been processed and maintains
 * the original decision status.
 */
export async function test_api_promotion_request_duplicate_decision_error(
  connection: api.IConnection,
): Promise<void> {
  // Create user accounts
  const userCredentials = {
    email: typia.random<string & typia.tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardUser.IJoin;
  // Create super administrator
  const superAdminCredentials = {
    email: typia.random<string & typia.tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    privilege_level: "super_admin",
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  // Setup user actor
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: userCredentials.email,
      password: userCredentials.password,
      display_name: userCredentials.display_name,
      bio: userCredentials.bio,
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Setup super admin actor
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: superAdminCredentials,
  });
  // Create promotion request
  const requestBody = {
    reason: RandomGenerator.paragraph({ sentences: 3 }) satisfies string &
      typia.tags.MinLength<50> &
      typia.tags.MaxLength<500> as string &
      typia.tags.MinLength<50> &
      typia.tags.MaxLength<500>,
  } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate;
  const promotionReq =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      { body: requestBody },
    );
  typia.assert(promotionReq);
  // Process the request by approving it
  const decisionBody = {
    status: "approved" as const,
    reviewer_notes: "Approved for testing purposes",
  } satisfies IDiscussionBoardAdministratorPromotionRequest.IUpdate;
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionReq.id,
        body: decisionBody,
      },
    );
  typia.assert(approvedRequest);
  // Attempt to process the same request again with different decision
  const duplicateDecisionBody = {
    status: "rejected" as const,
    reviewer_notes: "This should fail due to duplicate processing",
  } satisfies IDiscussionBoardAdministratorPromotionRequest.IUpdate;
  // Validate that duplicate decision attempt returns appropriate error
  await TestValidator.error(
    "duplicate promotion request decision should fail",
    async () => {
      await api.functional.discussionBoard.superAdmin.promotion_requests.update(
        superAdminConnection,
        {
          requestId: promotionReq.id,
          body: duplicateDecisionBody,
        },
      );
    },
  );
  // Verify that original approval status remains unchanged
  const finalRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionReq.id,
        body: {
          status: null,
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(finalRequest);
  TestValidator.equals(
    "request status should remain approved",
    finalRequest.status,
    "approved",
  );
  TestValidator.equals(
    "approved_at timestamp should be set",
    finalRequest.approved_at !== null,
    true,
  );
  TestValidator.equals(
    "rejected_at timestamp should remain null",
    finalRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "reviewer should be set",
    finalRequest.reviewer !== null,
    true,
  );
  TestValidator.equals(
    "administrator record should be created",
    finalRequest.administrator !== null,
    true,
  );
}