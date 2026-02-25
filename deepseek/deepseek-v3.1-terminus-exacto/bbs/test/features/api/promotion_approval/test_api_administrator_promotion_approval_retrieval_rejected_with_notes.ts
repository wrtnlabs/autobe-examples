import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { prepare_random_discussion_board_administrator_promotion_approval } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_approval";

/**
 * Test retrieving a rejected promotion approval with detailed reviewer notes.
 * Validates the complete promotion rejection workflow and approval record retrieval.
 */
export async function test_api_administrator_promotion_approval_retrieval_rejected_with_notes(
  connection: api.IConnection,
): Promise<void> {
  // Create reviewing super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create rejecting super administrator connection
  const rejectingSuperAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_super_admin_join(rejectingSuperAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create user connection and account
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // User submits promotion request
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Super administrator rejects the promotion request with detailed notes
  const rejectionNotes =
    "The applicant lacks sufficient community engagement and experience with platform moderation. We recommend gaining more experience before reconsidering.";
  const rejectedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.reject(
      rejectingSuperAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          reviewer_notes: rejectionNotes,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IReject,
      },
    );
  typia.assert(rejectedRequest);
  // Retrieve the approval decision
  const retrievedApproval =
    await api.functional.discussionBoard.superAdmin.administrator_promotion_approvals.at(
      superAdminConnection,
      {
        approvalId: rejectedRequest.id,
      },
    );
  typia.assert(retrievedApproval);
  // Validate rejection details
  TestValidator.equals(
    "status should be rejected",
    retrievedApproval.status,
    "rejected",
  );
  TestValidator.equals(
    "reviewer notes should match",
    retrievedApproval.reviewer_notes,
    rejectionNotes,
  );
  TestValidator.notEquals(
    "rejected timestamp should be set",
    retrievedApproval.rejected_at,
    null,
  );
  TestValidator.equals(
    "approved timestamp should remain null",
    retrievedApproval.approved_at,
    null,
  );
  TestValidator.equals(
    "user information should match",
    retrievedApproval.user.id,
    promotionRequest.user.id,
  );
  TestValidator.predicate(
    "reviewer should be set",
    retrievedApproval.reviewer !== null,
  );
  TestValidator.equals(
    "administrator assignment should be null for rejection",
    retrievedApproval.administrator,
    null,
  );
  // Validate audit trail timestamps
  TestValidator.predicate(
    "created timestamp should be valid",
    new Date(retrievedApproval.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "updated timestamp should be valid",
    new Date(retrievedApproval.updated_at) <= new Date(),
  );
  // Validate timeline consistency
  const created = new Date(retrievedApproval.created_at);
  const rejected = new Date(retrievedApproval.rejected_at!);
  const updated = new Date(retrievedApproval.updated_at);
  TestValidator.predicate(
    "rejection should occur after creation",
    rejected >= created,
  );
  TestValidator.predicate(
    "update should reflect latest rejection",
    updated >= rejected,
  );
}
