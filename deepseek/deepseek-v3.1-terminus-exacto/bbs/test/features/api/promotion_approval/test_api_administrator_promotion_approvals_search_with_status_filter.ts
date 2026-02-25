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

/**
 * Test the promotion approvals search functionality with status filtering.
 * 1. Create superAdmin account for approval privileges
 * 2. Create regular user account to submit promotion request
 * 3. Submit promotion request as regular user
 * 4. Approve the request as superAdmin
 * 5. Search approvals with 'approved' status filter
 * 6. Validate response contains the approved approval with correct data
 * 7. Verify only matching approvals returned and pagination works
 */
export async function test_api_administrator_promotion_approvals_search_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdmin authentication using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // 2. Regular user authentication using utility function
  const userConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.user.join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. User submits promotion request using SDK (no utility function available in template)
  const promotionRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 4. SuperAdmin approves the promotion request
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.approve(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          reviewer_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IApprove,
      },
    );
  typia.assert(approvedRequest);
  // 5. Search approvals with 'approved' status filter
  const searchResponse =
    await api.functional.discussionBoard.superAdmin.administrator_promotion_approvals.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(searchResponse);
  // 6. Validate the response contains our approved request
  TestValidator.predicate(
    "should have at least one approved approval",
    () => searchResponse.data.length >= 1,
  );
  const foundApproval = searchResponse.data.find(
    (approval) => approval.id === promotionRequest.id,
  );
  TestValidator.predicate(
    "approved request found in search results",
    () => foundApproval !== undefined,
  );
  if (foundApproval) {
    TestValidator.equals(
      "approval ID matches",
      foundApproval.id,
      promotionRequest.id,
    );
    TestValidator.equals(
      "status is approved",
      foundApproval.status,
      "approved",
    );
    TestValidator.predicate(
      "has approval timestamp",
      () => foundApproval.approved_at !== null,
    );
    TestValidator.predicate(
      "no rejection timestamp for approved",
      () => foundApproval.rejected_at === null,
    );
    // Verify user information is present
    TestValidator.predicate(
      "has user summary",
      () => foundApproval.user !== undefined,
    );
    TestValidator.equals(
      "user ID matches requester",
      foundApproval.user.id,
      promotionRequest.user.id,
    );
    // Optional reviewer notes check
    if (approvedRequest.reviewer_notes !== null) {
      TestValidator.equals(
        "reviewer notes match",
        foundApproval.reviewer_notes,
        approvedRequest.reviewer_notes,
      );
    }
  }
  // 7. Verify only approved items are returned
  for (const approval of searchResponse.data) {
    TestValidator.equals(
      "all items have approved status",
      approval.status,
      "approved",
    );
  }
  // 8. Verify pagination structure - navigate through nested pagination structure
  TestValidator.predicate("has pagination structure", () => {
    return (
      searchResponse.pagination !== undefined &&
      searchResponse.pagination.pagination !== undefined &&
      searchResponse.pagination.pagination.pagination !== undefined &&
      searchResponse.pagination.pagination.pagination.pagination !== undefined
    );
  });
  if (searchResponse.pagination?.pagination?.pagination?.pagination) {
    const finalPagination =
      searchResponse.pagination.pagination.pagination.pagination;
    TestValidator.predicate(
      "current page positive",
      () => finalPagination.current >= 1,
    );
    TestValidator.predicate(
      "limit within bounds",
      () => finalPagination.limit >= 1 && finalPagination.limit <= 100,
    );
    TestValidator.predicate(
      "records count matches",
      () => finalPagination.records >= searchResponse.data.length,
    );
    TestValidator.predicate(
      "pages calculated correctly",
      () => finalPagination.pages >= 1,
    );
  }
  // 9. Search with pending filter should not contain our approved request
  const pendingSearch =
    await api.functional.discussionBoard.superAdmin.administrator_promotion_approvals.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(pendingSearch);
  const foundInPending = pendingSearch.data.some(
    (approval) => approval.id === promotionRequest.id,
  );
  TestValidator.predicate(
    "approved request not in pending results",
    () => !foundInPending,
  );
}
