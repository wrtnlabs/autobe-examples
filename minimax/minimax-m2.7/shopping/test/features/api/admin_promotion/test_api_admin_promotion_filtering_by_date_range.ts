import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_promotion_filtering_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin account for testing
  const superAdminConnection: api.IConnection = { host: connection.host };
  const performerSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  // 2. Query all promotions first to get baseline count
  const initialPromotions =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    );
  typia.assert(initialPromotions);
  const initialPagination = initialPromotions.pagination
    .pagination as IPage.IPagination;
  const initialCount = initialPagination.records;
  const now = new Date();
  // 3. Test filtering with createdAtFrom only - use future date for empty result
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365);
  const futureDateStr = futureDate.toISOString();
  const filteredFromFuture =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: futureDateStr,
        } satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    );
  typia.assert(filteredFromFuture);
  const paginationFromFuture = filteredFromFuture.pagination
    .pagination as IPage.IPagination;
  TestValidator.equals(
    "no records after future date",
    filteredFromFuture.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0",
    paginationFromFuture.records,
    0,
  );
  // 4. Test filtering with createdAtTo only - use past date for empty result
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 365 * 10);
  const pastDateStr = pastDate.toISOString();
  const filteredToPast =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {
          createdAtTo: pastDateStr,
        } satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    );
  typia.assert(filteredToPast);
  const paginationToPast = filteredToPast.pagination
    .pagination as IPage.IPagination;
  TestValidator.equals(
    "no records before past date",
    filteredToPast.data.length,
    0,
  );
  TestValidator.equals("pagination records is 0", paginationToPast.records, 0);
  // 5. Test filtering with both createdAtFrom and createdAtTo (wide range)
  const yearAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 365);
  const yearAhead = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365);
  const wideRangePromotions =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: yearAgo.toISOString(),
          createdAtTo: yearAhead.toISOString(),
        } satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    );
  typia.assert(wideRangePromotions);
  const paginationWideRange = wideRangePromotions.pagination
    .pagination as IPage.IPagination;
  TestValidator.predicate(
    "has records within wide range",
    wideRangePromotions.data.length > 0,
  );
  TestValidator.predicate(
    "pagination records accurate",
    paginationWideRange.records > 0,
  );
  // 6. Test combining date range with action filter (promotion)
  const promotionOnlyWideRange =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: yearAgo.toISOString(),
          createdAtTo: yearAhead.toISOString(),
          action: "promotion",
        } satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    );
  typia.assert(promotionOnlyWideRange);
  for (const promotion of promotionOnlyWideRange.data) {
    TestValidator.equals("action is promotion", promotion.action, "promotion");
  }
  // 7. Test combining date range with action filter (demotion)
  const demotionOnlyWideRange =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: yearAgo.toISOString(),
          createdAtTo: yearAhead.toISOString(),
          action: "demotion",
        } satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    );
  typia.assert(demotionOnlyWideRange);
  for (const promotion of demotionOnlyWideRange.data) {
    TestValidator.equals("action is demotion", promotion.action, "demotion");
  }
  // 8. Test pagination with date range filter
  const page1 =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admin_promotions.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: yearAgo.toISOString(),
          createdAtTo: yearAhead.toISOString(),
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallAdminPromotion.IRequest,
      },
    );
  typia.assert(page1);
  const paginationPage1 = page1.pagination.pagination as IPage.IPagination;
  TestValidator.equals("limit is 5", paginationPage1.limit, 5);
  TestValidator.predicate("current page is 1", paginationPage1.current === 1);
  TestValidator.predicate(
    "data count matches limit or fewer",
    page1.data.length <= 5,
  );
  TestValidator.predicate(
    "total records >= data count",
    paginationPage1.records >= page1.data.length,
  );
}
