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

export async function test_api_super_admin_promotion_analytics_comprehensive_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create multiple test users
  const users = await Promise.all(
    ArrayUtil.repeat(5, async () => {
      const userConnection: api.IConnection = { host: connection.host };
      const user = await authorize_user_join(userConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
        } satisfies IDiscussionBoardUser.IJoin,
      });
      typia.assert(user);
      return user;
    }),
  );
  // 3. Create promotion requests with different statuses
  const requests = await Promise.all(
    users.slice(0, 3).map(async (user) => {
      const userConnection: api.IConnection = { host: connection.host };
      const request =
        await generate_random_discussion_board_user_promotion_requests_create(
          userConnection,
          {
            body: {
              reason: RandomGenerator.paragraph({
                sentences: 3,
                wordMin: 5,
                wordMax: 10,
              }),
            } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
          },
        );
      typia.assert(request);
      return request;
    }),
  );
  // 4. Approve some requests
  await api.functional.discussionBoard.superAdmin.promotion_requests.approve(
    superAdminConnection,
    {
      requestId: requests[0].id,
      body: {
        reviewer_notes: "Good candidate" satisfies string | null,
      } satisfies IDiscussionBoardAdministratorPromotionApproval.IApprove,
    },
  );
  // 5. Reject some requests
  await api.functional.discussionBoard.superAdmin.promotion_requests.reject(
    superAdminConnection,
    {
      requestId: requests[1].id,
      body: {
        reviewer_notes: "Insufficient experience" satisfies string | null,
      } satisfies IDiscussionBoardAdministratorPromotionApproval.IReject,
    },
  );
  // 6. Test comprehensive analytics filters
  // Test date range filtering
  const dateFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
      superAdminConnection,
      {
        body: {
          created_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_to: new Date().toISOString(),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(dateFilteredAnalytics);
  // Test status filtering
  const statusFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
      superAdminConnection,
      {
        body: {
          status: "pending" satisfies
            | "pending"
            | "approved"
            | "rejected"
            | null,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(statusFilteredAnalytics);
  // Test text search filtering
  const searchFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
      superAdminConnection,
      {
        body: {
          search: RandomGenerator.substring(requests[0].reason),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(searchFilteredAnalytics);
  // Test pagination
  const paginatedAnalytics =
    await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(paginatedAnalytics);
  // 7. Validate analytics response structure
  TestValidator.predicate(
    "analytics contains pagination data",
    paginatedAnalytics.pagination !== undefined,
  );
  TestValidator.predicate(
    "analytics contains data array",
    Array.isArray(paginatedAnalytics.data),
  );
  // 8. Test with multiple combined filters
  const combinedFilterAnalytics =
    await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
      superAdminConnection,
      {
        body: {
          status: "approved" satisfies
            | "approved"
            | "pending"
            | "rejected"
            | null,
          approved_from: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
          search: RandomGenerator.substring(requests[0].reason),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(combinedFilterAnalytics);
  // 9. Test empty result scenario
  const futureDateAnalytics =
    await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
      superAdminConnection,
      {
        body: {
          created_from: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(futureDateAnalytics);
  // 10. Validate metrics aggregation
  TestValidator.predicate(
    "paginated response has valid structure",
    typeof (paginatedAnalytics.pagination as any).page === "number" &&
      typeof (paginatedAnalytics.pagination as any).limit === "number" &&
      typeof (paginatedAnalytics.pagination as any).total === "number" &&
      typeof (paginatedAnalytics.pagination as any).totalPages === "number",
  );
}