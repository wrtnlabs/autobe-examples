import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionApproval";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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

export async function test_api_administrator_promotion_approvals_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account and connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create first user account and authenticate
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await api.functional.discussionBoard.auth.user.join(
    firstUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(firstUser);
  // 3. Create first promotion request
  const firstPromotionRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      firstUserConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(firstPromotionRequest);
  // 4. Create second user account and authenticate
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await api.functional.discussionBoard.auth.user.join(
    secondUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password456",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(secondUser);
  // 5. Create second promotion request
  const secondPromotionRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      secondUserConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(secondPromotionRequest);
  // 6. Record timestamps for date range testing
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // 7. Wait and approve first request
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const firstApproval =
    await api.functional.discussionBoard.superAdmin.promotion_requests.approve(
      superAdminConnection,
      {
        requestId: firstPromotionRequest.id,
        body: {
          reviewer_notes: "Good candidate",
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IApprove,
      },
    );
  typia.assert(firstApproval);
  // 8. Wait and approve second request
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const secondApproval =
    await api.functional.discussionBoard.superAdmin.promotion_requests.approve(
      superAdminConnection,
      {
        requestId: secondPromotionRequest.id,
        body: {
          reviewer_notes: "Excellent qualifications",
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IApprove,
      },
    );
  typia.assert(secondApproval);
  // 9. Test broad date range filtering (should include both approvals)
  const allApprovals =
    await api.functional.discussionBoard.superAdmin.administrator_promotion_approvals.index(
      superAdminConnection,
      {
        body: {
          created_from: yesterday.toISOString(),
          created_to: tomorrow.toISOString(),
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(allApprovals);
  TestValidator.equals(
    "broad date range should find exactly 2 approval records",
    allApprovals.data.length,
    2,
  );
  TestValidator.predicate(
    "both approval IDs should be found in broad date range",
    allApprovals.data.some((a) => a.id === firstApproval.id) &&
      allApprovals.data.some((a) => a.id === secondApproval.id),
  );
  // 10. Test narrow/future date range (should find zero)
  const narrowDateRange =
    await api.functional.discussionBoard.superAdmin.administrator_promotion_approvals.index(
      superAdminConnection,
      {
        body: {
          created_from: tomorrow.toISOString(),
          created_to: tomorrow.toISOString(),
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(narrowDateRange);
  TestValidator.equals(
    "future date range should find zero approvals",
    narrowDateRange.data.length,
    0,
  );
  // 11. Test approved_at date range filtering
  const approvedToday =
    await api.functional.discussionBoard.superAdmin.administrator_promotion_approvals.index(
      superAdminConnection,
      {
        body: {
          approved_from: yesterday.toISOString(),
          approved_to: tomorrow.toISOString(),
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(approvedToday);
  TestValidator.equals(
    "approved date range should find both approvals",
    approvedToday.data.length,
    2,
  );
  // 12. Validate chronological ordering
  TestValidator.predicate(
    "approvals should be ordered chronologically by created_at",
    new Date(approvedToday.data[0].created_at).getTime() <=
      new Date(approvedToday.data[1].created_at).getTime(),
  );
  // 13. Validate timestamp fields accuracy
  const firstApprovalSummary = approvedToday.data.find(
    (a) => a.id === firstApproval.id,
  )!;
  TestValidator.equals(
    "approved_at timestamp should be populated",
    firstApprovalSummary.approved_at !== null,
    true,
  );
  TestValidator.equals(
    "rejected_at should be null for approved requests",
    firstApprovalSummary.rejected_at,
    null,
  );
  TestValidator.equals(
    "status should be 'approved'",
    firstApprovalSummary.status,
    "approved",
  );
}
