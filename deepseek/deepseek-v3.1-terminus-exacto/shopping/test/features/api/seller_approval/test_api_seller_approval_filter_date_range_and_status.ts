import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEventOfSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_approval_filter_date_range_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(auth);
  // Generate random date range for filtering (within last 90 days)
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const endDate = new Date(ninetyDaysAgo.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days after start
  const submission_date_start = ninetyDaysAgo.toISOString();
  const submission_date_end = endDate.toISOString();
  // Search with combined status and date range filters
  const response =
    await api.functional.ecommerce.superAdministrator.seller_approvals.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          submission_date_start,
          submission_date_end,
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(response);
  // Validate response structure
  TestValidator.predicate(
    "has pagination metadata",
    response.pagination !== undefined,
  );
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // If there are results, validate filtering
  if (response.data.length > 0) {
    for (const approval of response.data) {
      TestValidator.equals(
        "status matches filter",
        approval.status,
        "approved",
      );
      const submissionDate = new Date(approval.submission_date);
      const startDateObj = new Date(submission_date_start);
      const endDateObj = new Date(submission_date_end);
      TestValidator.predicate(
        "submission date within start range",
        submissionDate >= startDateObj,
      );
      TestValidator.predicate(
        "submission date within end range",
        submissionDate <= endDateObj,
      );
    }
  }
  // Test pagination with second page
  const page2Response =
    await api.functional.ecommerce.superAdministrator.seller_approvals.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          submission_date_start,
          submission_date_end,
          page: 2,
          limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate pagination metadata
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  // Test that requesting page beyond available range returns empty or valid
  const beyondPage =
    Math.max(response.pagination.pages, page2Response.pagination.pages) + 1;
  const beyondPageResponse =
    await api.functional.ecommerce.superAdministrator.seller_approvals.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          submission_date_start,
          submission_date_end,
          page: beyondPage,
          limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  TestValidator.predicate(
    "beyond page has empty or no results",
    beyondPageResponse.data.length === 0 ||
      beyondPageResponse.pagination.records === 0,
  );
}
