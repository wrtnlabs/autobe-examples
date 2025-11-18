import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerOrderMetricsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerOrderMetricsSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerOrderMetricsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOrderMetricsSnapshot";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_seller_order_metrics_snapshot_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain admin actor & token
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Prepare a wide snapshot date window around now (±30 days)
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - 30 * dayMs).toISOString();
  const toDate = new Date(now.getTime() + 30 * dayMs).toISOString();

  // 3. First call: broad search, no sellerIds filter, sort by snapshotDate desc
  const limit: number & tags.Type<"int32"> = 2 as number & tags.Type<"int32">;

  const requestBodyPage1AllSellers = {
    snapshotDateFrom: fromDate,
    snapshotDateTo: toDate,
    sortBy: "snapshotDate",
    sortDirection: "desc",
    page: 1 as number & tags.Type<"int32">,
    limit,
  } satisfies IShoppingMallSellerOrderMetricsSnapshot.IRequest;

  const page1AllSellers: IPageIShoppingMallSellerOrderMetricsSnapshot.ISummary =
    await api.functional.shoppingMall.admin.sellerOrderMetricsSnapshots.index(
      connection,
      {
        body: requestBodyPage1AllSellers,
      },
    );
  typia.assert<IPageIShoppingMallSellerOrderMetricsSnapshot.ISummary>(
    page1AllSellers,
  );

  const pagination1: IPage.IPagination = page1AllSellers.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  // Basic pagination invariants
  TestValidator.predicate(
    "pagination current page should be >= 0",
    pagination1.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    pagination1.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    pagination1.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    pagination1.pages >= 0,
  );

  const allPage1Data = page1AllSellers.data;

  // If there are no records at all, we can only assert pagination consistency.
  if (pagination1.records === 0 || allPage1Data.length === 0) {
    TestValidator.equals(
      "no data when records is zero",
      allPage1Data.length,
      0,
    );
    return;
  }

  // Ensure snapshot_date ordering within page 1 for all sellers
  for (let i = 1; i < allPage1Data.length; i++) {
    const prev = new Date(allPage1Data[i - 1].snapshot_date).getTime();
    const curr = new Date(allPage1Data[i].snapshot_date).getTime();
    TestValidator.predicate(
      `snapshot_date desc order within page1 at index ${i}`,
      prev >= curr,
    );
  }

  // Pick the seller from the first snapshot row to focus on a single seller
  const targetSellerId = allPage1Data[0].seller.id;

  // 4. Focused pagination: same sort, but filter by sellerIds
  const requestBodyPage1 = {
    sellerIds: [targetSellerId],
    snapshotDateFrom: fromDate,
    snapshotDateTo: toDate,
    sortBy: "snapshotDate",
    sortDirection: "desc",
    page: 1 as number & tags.Type<"int32">,
    limit,
  } satisfies IShoppingMallSellerOrderMetricsSnapshot.IRequest;

  const page1: IPageIShoppingMallSellerOrderMetricsSnapshot.ISummary =
    await api.functional.shoppingMall.admin.sellerOrderMetricsSnapshots.index(
      connection,
      {
        body: requestBodyPage1,
      },
    );
  typia.assert<IPageIShoppingMallSellerOrderMetricsSnapshot.ISummary>(page1);

  const paginationSeller1: IPage.IPagination = page1.pagination;
  typia.assert<IPage.IPagination>(paginationSeller1);

  // Ensure page1.data respects limit and is ordered desc by snapshot_date
  const dataPage1 = page1.data;
  TestValidator.predicate(
    "page1 length should be <= limit",
    dataPage1.length <= limit,
  );
  for (let i = 1; i < dataPage1.length; i++) {
    const prev = new Date(dataPage1[i - 1].snapshot_date).getTime();
    const curr = new Date(dataPage1[i].snapshot_date).getTime();
    TestValidator.predicate(
      `snapshot_date desc order within page1 for seller at index ${i}`,
      prev >= curr,
    );
  }

  // If total records for this seller fit in a single page, we cannot test
  // cross-page behavior. Just ensure basic invariants and return.
  if (paginationSeller1.records <= paginationSeller1.limit) {
    TestValidator.predicate(
      "single page scenario has pages === 1",
      paginationSeller1.pages === 1,
    );
    return;
  }

  // 5. Fetch page 2 with the same filters/sorting
  const requestBodyPage2 = {
    sellerIds: [targetSellerId],
    snapshotDateFrom: fromDate,
    snapshotDateTo: toDate,
    sortBy: "snapshotDate",
    sortDirection: "desc",
    page: 2 as number & tags.Type<"int32">,
    limit,
  } satisfies IShoppingMallSellerOrderMetricsSnapshot.IRequest;

  const page2: IPageIShoppingMallSellerOrderMetricsSnapshot.ISummary =
    await api.functional.shoppingMall.admin.sellerOrderMetricsSnapshots.index(
      connection,
      {
        body: requestBodyPage2,
      },
    );
  typia.assert<IPageIShoppingMallSellerOrderMetricsSnapshot.ISummary>(page2);

  const paginationSeller2: IPage.IPagination = page2.pagination;
  typia.assert<IPage.IPagination>(paginationSeller2);

  const dataPage2 = page2.data;
  TestValidator.predicate(
    "page2 length should be <= limit",
    dataPage2.length <= limit,
  );

  for (let i = 1; i < dataPage2.length; i++) {
    const prev = new Date(dataPage2[i - 1].snapshot_date).getTime();
    const curr = new Date(dataPage2[i].snapshot_date).getTime();
    TestValidator.predicate(
      `snapshot_date desc order within page2 for seller at index ${i}`,
      prev >= curr,
    );
  }

  // Combine page1 and page2 to ensure no duplicate snapshot IDs
  const combined = [...dataPage1, ...dataPage2];
  const uniqueIds = new Set(combined.map((s) => s.id));
  TestValidator.equals(
    "combined page1+page2 snapshot IDs must be unique",
    combined.length,
    uniqueIds.size,
  );

  // 6. Optional: verify ascending sorting reverses ordering semantics
  const ascRequestBodyPage1 = {
    sellerIds: [targetSellerId],
    snapshotDateFrom: fromDate,
    snapshotDateTo: toDate,
    sortBy: "snapshotDate",
    sortDirection: "asc",
    page: 1 as number & tags.Type<"int32">,
    limit,
  } satisfies IShoppingMallSellerOrderMetricsSnapshot.IRequest;

  const ascPage1: IPageIShoppingMallSellerOrderMetricsSnapshot.ISummary =
    await api.functional.shoppingMall.admin.sellerOrderMetricsSnapshots.index(
      connection,
      {
        body: ascRequestBodyPage1,
      },
    );
  typia.assert<IPageIShoppingMallSellerOrderMetricsSnapshot.ISummary>(ascPage1);

  const ascDataPage1 = ascPage1.data;
  if (ascDataPage1.length > 0 && dataPage1.length > 0) {
    // Desc page1 is newest -> oldest, so first element is newest.
    const descFirstDate = new Date(dataPage1[0].snapshot_date).getTime();
    // Asc page1 is oldest -> newest, so first element is oldest.
    const ascFirstDate = new Date(ascDataPage1[0].snapshot_date).getTime();
    TestValidator.predicate(
      "asc first snapshot_date should be <= desc first snapshot_date",
      ascFirstDate <= descFirstDate,
    );
  }
}
