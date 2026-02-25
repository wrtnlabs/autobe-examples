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

export async function test_api_administrator_promotion_approval_retrieval_approved_decision(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate reviewing super administrator
  const reviewingSuperAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_super_admin_join(reviewingSuperAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create and authenticate user who will submit promotion request
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 3. User submits promotion request
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(promotionRequest);
  // 4. Create and authenticate approving super administrator
  const approvingSuperAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_super_admin_join(approvingSuperAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 5. Approving super admin approves the promotion request
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.approve(
      approvingSuperAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          reviewer_notes: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IApprove,
      },
    );
  typia.assert(approvedRequest);
  // 6. Reviewing super admin retrieves the approval decision
  const retrievedApproval =
    await api.functional.discussionBoard.superAdmin.administrator_promotion_approvals.at(
      reviewingSuperAdminConnection,
      {
        approvalId: approvedRequest.id,
      },
    );
  typia.assert(retrievedApproval);
  // 7. Validate the approval decision details
  TestValidator.equals(
    "approval status should be approved",
    retrievedApproval.status,
    "approved",
  );
  TestValidator.predicate(
    "approved_at timestamp should be set",
    retrievedApproval.approved_at !== null,
  );
  TestValidator.predicate(
    "rejected_at timestamp should be null",
    retrievedApproval.rejected_at === null,
  );
  TestValidator.predicate(
    "reviewer_notes should be set",
    retrievedApproval.reviewer_notes !== null,
  );
  TestValidator.equals(
    "user id should match",
    retrievedApproval.user.id,
    promotionRequest.user.id,
  );
  TestValidator.equals(
    "request reason should match",
    retrievedApproval.reason,
    promotionRequest.reason,
  );
  TestValidator.predicate(
    "reviewer should be set",
    retrievedApproval.reviewer !== null,
  );
  TestValidator.equals(
    "reviewer id should match approving super admin",
    retrievedApproval.reviewer!.id,
    approvedRequest.reviewer!.id,
  );
}
