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

export async function test_api_super_admin_promotion_analytics_mixed_status_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create users and generate promotion requests with different statuses and timestamps
  const userRequests: IDiscussionBoardAdministratorPromotionApproval[] = [];
  // Create users and generate requests with varying timestamps
  for (let i = 0; i < 10; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    // Create promotion request
    const request =
      await generate_random_discussion_board_user_promotion_requests_create(
        userConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 15,
              wordMax: 20,
            }),
          } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
        },
      );
    typia.assert(request);
    userRequests.push(request);
  }
  // Process requests with different statuses and timestamps
  const processedRequests: IDiscussionBoardAdministratorPromotionApproval[] =
    [];
  // Approve some requests
  for (let i = 0; i < 4; i++) {
    const request = userRequests[i];
    const approvedRequest =
      await api.functional.discussionBoard.superAdmin.promotion_requests.approve(
        superAdminConnection,
        {
          requestId: request.id satisfies string & tags.Format<"uuid">,
          body: {
            reviewer_notes: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardAdministratorPromotionApproval.IApprove,
        },
      );
    typia.assert(approvedRequest);
    processedRequests.push(approvedRequest);
  }
  // Reject some requests
  for (let i = 4; i < 7; i++) {
    const request = userRequests[i];
    const rejectedRequest =
      await api.functional.discussionBoard.superAdmin.promotion_requests.reject(
        superAdminConnection,
        {
          requestId: request.id satisfies string & tags.Format<"uuid">,
          body: {
            reviewer_notes: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardAdministratorPromotionApproval.IReject,
        },
      );
    typia.assert(rejectedRequest);
    processedRequests.push(rejectedRequest);
  }
  // Leave some requests as pending
  for (let i = 7; i < 10; i++) {
    console.log(processedRequests.push(userRequests[i]));
  }
  // Test analytics endpoint with different filtering options
  const analytics =
    await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
      superAdminConnection,
      {
        body: {
          status: null,
          search: undefined,
          limit: 50 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(analytics);
  // Validate analytics structure and basic metrics
  TestValidator.predicate(
    "analytics has pagination",
    analytics.pagination !== undefined,
  );
  TestValidator.predicate(
    "analytics has data array",
    Array.isArray(analytics.data),
  );
  TestValidator.predicate(
    "analytics data contains records",
    analytics.data.length > 0,
  );
  // Test with different status filters
  const pendingAnalytics =
    await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          limit: 50 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(pendingAnalytics);
  // Test business logic validations
  TestValidator.predicate(
    "pending requests count matches",
    pendingAnalytics.data.length >= 3,
  );
  // Test statistical aggregation by verifying data completeness
  analytics.data.forEach((item) => {
    TestValidator.predicate(
      "item has required properties",
      item.id !== undefined &&
        item.status !== undefined &&
        item.created_at !== undefined,
    );
    if (item.status === "approved" && item.approved_at) {
      TestValidator.predicate(
        "approved request has approval date",
        new Date(item.approved_at) >= new Date(item.created_at),
      );
    }
    if (item.status === "rejected" && item.rejected_at) {
      TestValidator.predicate(
        "rejected request has rejection date",
        new Date(item.rejected_at) >= new Date(item.created_at),
      );
    }
  });
}
