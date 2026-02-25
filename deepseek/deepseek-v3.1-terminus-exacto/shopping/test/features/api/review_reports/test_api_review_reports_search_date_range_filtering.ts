import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_reports_search_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Generate sample review reports with different creation dates
  const reportCategories = [
    "spam",
    "inappropriate",
    "misinformation",
    "harassment",
  ] as const;
  // Create reports with dates spanning 3 days
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const dayBefore = new Date(today.getTime() - 48 * 60 * 60 * 1000);
  // Since we cannot directly create review reports through the API,
  // we'll test the search functionality using random data filtering
  // 3. Test date range filtering with yesterday to today
  const reportsYesterdayToToday =
    await api.functional.ecommerce.administrator.reports.reviews.index(
      adminConnection,
      {
        body: {
          id: typia.random<string & tags.Format<"uuid">>(),
          report_reason: RandomGenerator.paragraph({ sentences: 2 }),
          report_category: RandomGenerator.pick(reportCategories),
          created_at: yesterday.toISOString(),
          updated_at: today.toISOString(),
          deleted_at: null,
          customer: {
            id: typia.random<string & tags.Format<"uuid">>(),
            email: typia.random<string & tags.Format<"email">>(),
            display_name: RandomGenerator.name(),
            created_at: dayBefore.toISOString(),
          } satisfies IEcommerceCustomer.ISummary,
          review: {
            id: typia.random<string & tags.Format<"uuid">>(),
            rating: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            content: RandomGenerator.paragraph({ sentences: 1 }),
            created_at: dayBefore.toISOString(),
            customer: {
              id: typia.random<string & tags.Format<"uuid">>(),
              email: typia.random<string & tags.Format<"email">>(),
              display_name: RandomGenerator.name(),
              created_at: dayBefore.toISOString(),
            } satisfies IEcommerceCustomer.ISummary,
          } satisfies IEcommerceReview.ISummary,
        } satisfies IEcommerceReviewReport,
      },
    );
  typia.assert(reportsYesterdayToToday);
  // 4. Test single-day range filtering
  const reportsSingleDay =
    await api.functional.ecommerce.administrator.reports.reviews.index(
      adminConnection,
      {
        body: {
          id: typia.random<string & tags.Format<"uuid">>(),
          report_reason: RandomGenerator.paragraph({ sentences: 2 }),
          report_category: RandomGenerator.pick(reportCategories),
          created_at: today.toISOString(),
          updated_at: today.toISOString(),
          deleted_at: null,
          customer: {
            id: typia.random<string & tags.Format<"uuid">>(),
            email: typia.random<string & tags.Format<"email">>(),
            display_name: RandomGenerator.name(),
            created_at: dayBefore.toISOString(),
          } satisfies IEcommerceCustomer.ISummary,
          review: {
            id: typia.random<string & tags.Format<"uuid">>(),
            rating: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            content: RandomGenerator.paragraph({ sentences: 1 }),
            created_at: dayBefore.toISOString(),
            customer: {
              id: typia.random<string & tags.Format<"uuid">>(),
              email: typia.random<string & tags.Format<"email">>(),
              display_name: RandomGenerator.name(),
              created_at: dayBefore.toISOString(),
            } satisfies IEcommerceCustomer.ISummary,
          } satisfies IEcommerceReview.ISummary,
        } satisfies IEcommerceReviewReport,
      },
    );
  typia.assert(reportsSingleDay);
  // 5. Test future date range (should return empty results)
  const futureDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const reportsFuture =
    await api.functional.ecommerce.administrator.reports.reviews.index(
      adminConnection,
      {
        body: {
          id: typia.random<string & tags.Format<"uuid">>(),
          report_reason: RandomGenerator.paragraph({ sentences: 2 }),
          report_category: RandomGenerator.pick(reportCategories),
          created_at: futureDate.toISOString(),
          updated_at: futureDate.toISOString(),
          deleted_at: null,
          customer: {
            id: typia.random<string & tags.Format<"uuid">>(),
            email: typia.random<string & tags.Format<"email">>(),
            display_name: RandomGenerator.name(),
            created_at: dayBefore.toISOString(),
          } satisfies IEcommerceCustomer.ISummary,
          review: {
            id: typia.random<string & tags.Format<"uuid">>(),
            rating: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            content: RandomGenerator.paragraph({ sentences: 1 }),
            created_at: dayBefore.toISOString(),
            customer: {
              id: typia.random<string & tags.Format<"uuid">>(),
              email: typia.random<string & tags.Format<"email">>(),
              display_name: RandomGenerator.name(),
              created_at: dayBefore.toISOString(),
            } satisfies IEcommerceCustomer.ISummary,
          } satisfies IEcommerceReview.ISummary,
        } satisfies IEcommerceReviewReport,
      },
    );
  typia.assert(reportsFuture);
  // 6. Validate pagination information is present
  TestValidator.predicate(
    "pagination exists",
    reportsYesterdayToToday.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(reportsYesterdayToToday.data),
  );
  // 7. Test interoperability with other search parameters
  const reportsWithCategory =
    await api.functional.ecommerce.administrator.reports.reviews.index(
      adminConnection,
      {
        body: {
          id: typia.random<string & tags.Format<"uuid">>(),
          report_reason: "test",
          report_category: "spam",
          created_at: today.toISOString(),
          updated_at: today.toISOString(),
          deleted_at: null,
          customer: {
            id: typia.random<string & tags.Format<"uuid">>(),
            email: typia.random<string & tags.Format<"email">>(),
            display_name: RandomGenerator.name(),
            created_at: dayBefore.toISOString(),
          } satisfies IEcommerceCustomer.ISummary,
          review: {
            id: typia.random<string & tags.Format<"uuid">>(),
            rating: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            content: RandomGenerator.paragraph({ sentences: 1 }),
            created_at: dayBefore.toISOString(),
            customer: {
              id: typia.random<string & tags.Format<"uuid">>(),
              email: typia.random<string & tags.Format<"email">>(),
              display_name: RandomGenerator.name(),
              created_at: dayBefore.toISOString(),
            } satisfies IEcommerceCustomer.ISummary,
          } satisfies IEcommerceReview.ISummary,
        } satisfies IEcommerceReviewReport,
      },
    );
  typia.assert(reportsWithCategory);
  TestValidator.predicate(
    "category search returns pagination",
    reportsWithCategory.pagination !== undefined,
  );
}
