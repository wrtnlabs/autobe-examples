import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundAndDisputeStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundAndDisputeStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundAndDisputeStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundAndDisputeStat";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_refund_and_dispute_stats_filtered_by_refund_rate_and_dispute_rate(
  connection: api.IConnection,
) {
  // 1. Admin join to simulate realistic admin usage (even though SDK
  //    already handles headers, this ensures we hit auth flow once).
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.example.com/join" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Build a baseline analytics request over a broad date range without
  //    any rate filters. We'll query last 30 days.
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - thirtyDaysMs);

  const baselineRequest = {
    dateFrom: fromDate.toISOString() as string & tags.Format<"date-time">,
    dateTo: now.toISOString() as string & tags.Format<"date-time">,
    // No rate filters here; generic paging defaults
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies IShoppingMallRefundAndDisputeStat.IRequest;

  const baselinePage: IPageIShoppingMallRefundAndDisputeStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.refundAndDisputeStats.index(
      connection,
      { body: baselineRequest },
    );
  typia.assert<IPageIShoppingMallRefundAndDisputeStat.ISummary>(baselinePage);

  const baselineRecords = baselinePage.pagination.records;
  TestValidator.predicate(
    "baseline records should be non-negative",
    baselineRecords >= 0,
  );

  // If there's no data at all, we can't meaningfully test filtering, but we
  // still have validated type safety above. Just exit early.
  if (baselineRecords === 0) return;

  // 3. High minRefundRate & minDisputeRate filters.
  const highMinRequest = {
    ...baselineRequest,
    minRefundRate: 0.5,
    minDisputeRate: 0.5,
  } satisfies IShoppingMallRefundAndDisputeStat.IRequest;

  const highMinPage: IPageIShoppingMallRefundAndDisputeStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.refundAndDisputeStats.index(
      connection,
      { body: highMinRequest },
    );
  typia.assert<IPageIShoppingMallRefundAndDisputeStat.ISummary>(highMinPage);

  TestValidator.predicate(
    "highMin records must be <= baseline records",
    highMinPage.pagination.records <= baselinePage.pagination.records,
  );

  // 4. Even stricter minRefundRate & minDisputeRate.
  const stricterMinRequest = {
    ...baselineRequest,
    minRefundRate: 0.9,
    minDisputeRate: 0.9,
  } satisfies IShoppingMallRefundAndDisputeStat.IRequest;

  const stricterMinPage: IPageIShoppingMallRefundAndDisputeStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.refundAndDisputeStats.index(
      connection,
      { body: stricterMinRequest },
    );
  typia.assert<IPageIShoppingMallRefundAndDisputeStat.ISummary>(
    stricterMinPage,
  );

  TestValidator.predicate(
    "stricterMin records must be <= highMin records",
    stricterMinPage.pagination.records <= highMinPage.pagination.records,
  );

  // 5. maxRefundRate & maxDisputeRate filters.
  const maxRequest = {
    ...baselineRequest,
    maxRefundRate: 0.3,
    maxDisputeRate: 0.3,
  } satisfies IShoppingMallRefundAndDisputeStat.IRequest;

  const maxPage: IPageIShoppingMallRefundAndDisputeStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.refundAndDisputeStats.index(
      connection,
      { body: maxRequest },
    );
  typia.assert<IPageIShoppingMallRefundAndDisputeStat.ISummary>(maxPage);

  TestValidator.predicate(
    "max-filtered records must be <= baseline records",
    maxPage.pagination.records <= baselinePage.pagination.records,
  );

  const stricterMaxRequest = {
    ...baselineRequest,
    maxRefundRate: 0.1,
    maxDisputeRate: 0.1,
  } satisfies IShoppingMallRefundAndDisputeStat.IRequest;

  const stricterMaxPage: IPageIShoppingMallRefundAndDisputeStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.refundAndDisputeStats.index(
      connection,
      { body: stricterMaxRequest },
    );
  typia.assert<IPageIShoppingMallRefundAndDisputeStat.ISummary>(
    stricterMaxPage,
  );

  TestValidator.predicate(
    "stricterMax records must be <= max-filtered records",
    stricterMaxPage.pagination.records <= maxPage.pagination.records,
  );

  // 6. Basic structural validation on at least one non-empty page's data,
  //    preferring the baseline page.
  const samplePage =
    baselinePage.pagination.records > 0
      ? baselinePage
      : highMinPage.pagination.records > 0
        ? highMinPage
        : maxPage;

  if (samplePage.pagination.records > 0) {
    // Validate that all rows structurally conform and that stats_date is a
    // proper date-time string.
    await ArrayUtil.asyncForEach(samplePage.data, async (row, index) => {
      typia.assert<IShoppingMallRefundAndDisputeStat.ISummary>(row);

      TestValidator.predicate(
        `row ${index} stats_date should parse as valid date`,
        !Number.isNaN(Date.parse(row.stats_date)),
      );
    });
  }
}
