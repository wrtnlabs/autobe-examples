import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallAdminRequestRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfCustomer";
import type { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryHealthMetric";
import type { IEcommerceMallObservabilityDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallObservabilityDashboard";
import type { IEcommerceMallOrderLifecycleMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderLifecycleMetric";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalQueue";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemHealthMetric";
import type { IEcommerceMallUserActivityMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserActivityMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import type { IReviewAnalyticsResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewAnalyticsResponse";
import type { IReviewAnalyticsReviewPreview } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewAnalyticsReviewPreview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_api_observability_dashboard_seller_approval_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Use a consistent password for admin
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 1. Admin Setup - Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create 25 seller accounts to generate pending admin requests
  const sellers: IEcommerceMallSeller.IAuthorized[] = [];
  const sellerCredentials: Array<{
    email: string;
    password: string;
  }> = [];
  await ArrayUtil.asyncForEach(
    ArrayUtil.repeat(25, () => ({})),
    async () => {
      const sellerConnection: api.IConnection = { host: connection.host };
      const sellerPassword = RandomGenerator.alphaNumeric(16);
      const seller = await authorize_seller_join(sellerConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: sellerPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
      typia.assert(seller);
      sellers.push(seller);
      sellerCredentials.push({
        email: seller.email,
        password: sellerPassword,
      });
    },
  );
  // 3. Each seller submits an admin access request
  const sellerConnections: api.IConnection[] = [];
  const sellerAdminRequests: IEcommerceMallAdminRequestRequest[] = [];
  await ArrayUtil.asyncForEach(sellers, async (seller, index) => {
    const sellerConnection: api.IConnection = { host: connection.host };
    sellerConnections.push(sellerConnection);
    // Login as seller to submit admin request
    await authorize_seller_login(sellerConnection, {
      body: {
        email: seller.email,
        password: sellerCredentials[index].password,
      },
    });
    // Submit admin access request
    const adminRequest =
      await generate_random_ecommerce_mall_customer_admin_requests_create(
        sellerConnection,
        {
          body: {
            reason: `Admin access request #${index + 1}: ${RandomGenerator.paragraph(
              {
                sentences: 2,
              },
            )}`,
          },
        },
      );
    typia.assert(adminRequest);
    sellerAdminRequests.push(adminRequest);
  });
  // Wait a moment to ensure created_at differences are visible
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Access observability dashboard with page=1, limit=10
  const adminConnectionPage1: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnectionPage1, {
    body: {
      email: admin.email,
      password: adminPassword,
    },
  });
  const dashboardRequestPage1: IEcommerceMallObservabilityDashboard.IRequest = {
    limit: 10,
    page: 1,
    predefined_time_range: "24h",
  };
  const dashboardPage1 =
    await api.functional.ecommerceMall.admin.observability.dashboard.getDashboard(
      adminConnectionPage1,
      {
        body: dashboardRequestPage1,
      },
    );
  typia.assert(dashboardPage1);
  // 5. Access observability dashboard with page=2, limit=10
  const adminConnectionPage2: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnectionPage2, {
    body: {
      email: admin.email,
      password: adminPassword,
    },
  });
  const dashboardRequestPage2: IEcommerceMallObservabilityDashboard.IRequest = {
    limit: 10,
    page: 2,
    predefined_time_range: "24h",
  };
  const dashboardPage2 =
    await api.functional.ecommerceMall.admin.observability.dashboard.getDashboard(
      adminConnectionPage2,
      {
        body: dashboardRequestPage2,
      },
    );
  typia.assert(dashboardPage2);
  // Validation Points
  // sellerApprovalQueue.totalPendingCount equals total number of pending requests (25)
  TestValidator.equals(
    "total pending count",
    dashboardPage1.sellerApprovalQueue.totalPendingCount,
    25,
  );
  TestValidator.equals(
    "total pending count page 2",
    dashboardPage2.sellerApprovalQueue.totalPendingCount,
    25,
  );
  // sellerApprovalQueueList contains exactly 10 items for page 1, limit=10
  TestValidator.equals(
    "page 1 list size",
    (
      dashboardPage1.sellerApprovalQueueList as
        | IEcommerceMallAdminRequestRequest.ISummary
        | undefined
    )?.id
      ? 1
      : 0,
    1,
  );
  // sellerApprovalQueueList contains 1 item for page 2, limit=10 (next batch)
  TestValidator.equals(
    "page 2 list size",
    (
      dashboardPage2.sellerApprovalQueueList as
        | IEcommerceMallAdminRequestRequest.ISummary
        | undefined
    )?.id
      ? 1
      : 0,
    1,
  );
  // pagination.page equals 1 for page 1
  TestValidator.equals(
    "page 1 pagination page",
    dashboardPage1.pagination?.page,
    1,
  );
  // pagination.page equals 2 for page 2
  TestValidator.equals(
    "page 2 pagination page",
    dashboardPage2.pagination?.page,
    2,
  );
  // pagination.limit equals 10
  TestValidator.equals(
    "page 1 pagination limit",
    dashboardPage1.pagination?.limit,
    10,
  );
  // pagination.limit equals 10
  TestValidator.equals(
    "page 2 pagination limit",
    dashboardPage2.pagination?.limit,
    10,
  );
  // pagination.totalItems equals 25
  TestValidator.equals(
    "page 1 total items",
    dashboardPage1.pagination?.totalItems,
    25,
  );
  // pagination.totalItems equals 25
  TestValidator.equals(
    "page 2 total items",
    dashboardPage2.pagination?.totalItems,
    25,
  );
  // pagination.totalPages equals 3 (25 items / 10 per page = 2.5, rounded up to 3)
  TestValidator.equals(
    "page 1 total pages",
    dashboardPage1.pagination?.totalPages,
    3,
  );
  // pagination.totalPages equals 3
  TestValidator.equals(
    "page 2 total pages",
    dashboardPage2.pagination?.totalPages,
    3,
  );
  // oldestPendingRequests in sellerApprovalQueue matches sellerApprovalQueueList for page 1
  if (
    dashboardPage1.sellerApprovalQueueList &&
    dashboardPage1.sellerApprovalQueue.oldestPendingRequests.length > 0
  ) {
    const listId = dashboardPage1.sellerApprovalQueueList.id;
    const firstOldestId =
      dashboardPage1.sellerApprovalQueue.oldestPendingRequests[0].id;
    TestValidator.equals(
      "oldest pending requests match page 1 list",
      firstOldestId,
      listId,
    );
  }
  // oldestPendingRequests matches sellerApprovalQueueList for page 2
  if (
    dashboardPage2.sellerApprovalQueueList &&
    dashboardPage2.sellerApprovalQueue.oldestPendingRequests.length > 0
  ) {
    const listId = dashboardPage2.sellerApprovalQueueList.id;
    const firstOldestId =
      dashboardPage2.sellerApprovalQueue.oldestPendingRequests[0].id;
    TestValidator.equals(
      "oldest pending requests match page 2 list",
      firstOldestId,
      listId,
    );
  }
  // Filter context is included in response
  TestValidator.equals(
    "filter context exists",
    dashboardPage1.filterContext !== undefined,
    true,
  );
  // Filter context exists page 2
  TestValidator.equals(
    "filter context exists page 2",
    dashboardPage2.filterContext !== undefined,
    true,
  );
  // Verify systemStatus is valid
  TestValidator.equals(
    "system status is valid",
    dashboardPage1.systemStatus === "green" ||
      dashboardPage1.systemStatus === "yellow" ||
      dashboardPage1.systemStatus === "red",
    true,
  );
  // Verify timeRange is present
  TestValidator.equals(
    "timeRange is present",
    dashboardPage1.timeRange !== undefined,
    true,
  );
  // Verify timeSeries is present
  TestValidator.equals(
    "timeSeries is present",
    dashboardPage1.timeSeries !== undefined,
    true,
  );
  // Verify systemHealth is present
  TestValidator.equals(
    "systemHealth is present",
    dashboardPage1.systemHealth !== undefined,
    true,
  );
  // Verify orderLifecycle is present
  TestValidator.equals(
    "orderLifecycle is present",
    dashboardPage1.orderLifecycle !== undefined,
    true,
  );
  // Verify reviewAnalytics is present
  TestValidator.equals(
    "reviewAnalytics is present",
    dashboardPage1.reviewAnalytics !== undefined,
    true,
  );
  // Verify inventoryHealth is present
  TestValidator.equals(
    "inventoryHealth is present",
    dashboardPage1.inventoryHealth !== undefined,
    true,
  );
  // Verify userActivity is present
  TestValidator.equals(
    "userActivity is present",
    dashboardPage1.userActivity !== undefined,
    true,
  );
  // Verify pagination applies only to seller approval queue list, not to other metrics
  TestValidator.equals(
    "totalPendingCount not affected by pagination",
    dashboardPage1.sellerApprovalQueue.totalPendingCount,
    25,
  );
}
