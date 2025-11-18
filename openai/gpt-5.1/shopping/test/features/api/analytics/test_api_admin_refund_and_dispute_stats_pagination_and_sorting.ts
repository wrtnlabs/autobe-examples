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

export async function test_api_admin_refund_and_dispute_stats_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin join and login to ensure we have an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  const adminLoginBody = {
    email: joinedAdmin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 2. Build a wide date range covering a reasonable window
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFrom = thirtyDaysAgo.toISOString();
  const dateTo = now.toISOString();

  const basePage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const baseLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const baseRequest = {
    dateFrom,
    dateTo,
    page: basePage,
    limit: baseLimit,
    orderBy: "stats_date",
    orderDirection: "asc" as "asc" | "desc",
  } satisfies IShoppingMallRefundAndDisputeStat.IRequest;

  // 3. Call analytics endpoint for page 1 ascending
  const page1: IPageIShoppingMallRefundAndDisputeStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.refundAndDisputeStats.index(
      connection,
      { body: baseRequest },
    );
  typia.assert(page1);

  // Basic pagination invariants
  const p1 = page1.pagination;
  const p1Current: number = p1.current;
  const p1Limit: number = p1.limit;
  const p1Records: number = p1.records;
  const p1Pages: number = p1.pages;
  const reqPage1: number = baseRequest.page ?? 1;
  const reqLimit: number = baseRequest.limit ?? 10;

  TestValidator.equals(
    "page1 current page equals request",
    p1Current,
    reqPage1,
  );
  TestValidator.equals("page1 limit equals request", p1Limit, reqLimit);
  TestValidator.predicate(
    "page1 pages times limit covers at least records",
    p1Pages * p1Limit >= p1Records,
  );

  // Ordering invariants for page1
  const data1 = page1.data;
  TestValidator.predicate(
    "page1 data size not exceeding limit",
    data1.length <= p1Limit,
  );
  for (let i = 1; i < data1.length; i++) {
    const prev = data1[i - 1];
    const curr = data1[i];
    TestValidator.predicate(
      `page1 ascending order at index ${i}`,
      prev.stats_date <= curr.stats_date,
    );
  }

  // 4. Call analytics endpoint for page 2 ascending, only if there are more pages
  if (p1Pages >= 2) {
    const page2Number = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

    const requestPage2 = {
      ...baseRequest,
      page: page2Number,
    } satisfies IShoppingMallRefundAndDisputeStat.IRequest;

    const page2: IPageIShoppingMallRefundAndDisputeStat.ISummary =
      await api.functional.shoppingMall.admin.analytics.refundAndDisputeStats.index(
        connection,
        { body: requestPage2 },
      );
    typia.assert(page2);

    const p2 = page2.pagination;
    const p2Current: number = p2.current;
    const p2Limit: number = p2.limit;
    const reqPage2Num: number = requestPage2.page ?? 2;
    const reqLimit2: number = requestPage2.limit ?? reqLimit;

    TestValidator.equals(
      "page2 current page equals request",
      p2Current,
      reqPage2Num,
    );
    TestValidator.equals("page2 limit equals request", p2Limit, reqLimit2);

    const data2 = page2.data;
    TestValidator.predicate(
      "page2 data size not exceeding limit",
      data2.length <= p2Limit,
    );

    for (let i = 1; i < data2.length; i++) {
      const prev = data2[i - 1];
      const curr = data2[i];
      TestValidator.predicate(
        `page2 ascending order at index ${i}`,
        prev.stats_date <= curr.stats_date,
      );
    }

    // Check that concatenated data are non-decreasing overall
    const combined = [...data1, ...data2];
    for (let i = 1; i < combined.length; i++) {
      const prev = combined[i - 1];
      const curr = combined[i];
      TestValidator.predicate(
        `combined ascending order at index ${i}`,
        prev.stats_date <= curr.stats_date,
      );
    }

    // If we have at least a full page for both, ensure no overlap by (id, stats_date)
    if (data1.length === p1Limit && data2.length === p2Limit) {
      const set1 = new Set(data1.map((r) => `${r.id}-${r.stats_date}`));
      const overlaps = data2.some((r) => set1.has(`${r.id}-${r.stats_date}`));
      TestValidator.predicate(
        "no overlap between page1 and page2 records",
        overlaps === false,
      );
    }
  }

  // 5. Call with descending order on page 1
  const descRequest = {
    ...baseRequest,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallRefundAndDisputeStat.IRequest;

  const descPage1: IPageIShoppingMallRefundAndDisputeStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.refundAndDisputeStats.index(
      connection,
      { body: descRequest },
    );
  typia.assert(descPage1);

  const descData = descPage1.data;
  const descPagination = descPage1.pagination;
  const descCurrent: number = descPagination.current;
  const descLimit: number = descPagination.limit;
  const descReqPage: number = descRequest.page ?? 1;
  const descReqLimit: number = descRequest.limit ?? reqLimit;

  TestValidator.equals(
    "desc page1 current page equals request",
    descCurrent,
    descReqPage,
  );
  TestValidator.equals(
    "desc page1 limit equals request",
    descLimit,
    descReqLimit,
  );
  TestValidator.predicate(
    "desc page1 data size not exceeding limit",
    descData.length <= descLimit,
  );

  for (let i = 1; i < descData.length; i++) {
    const prev = descData[i - 1];
    const curr = descData[i];
    TestValidator.predicate(
      `descending order at index ${i}`,
      prev.stats_date >= curr.stats_date,
    );
  }

  // 6. Optional: request a page far beyond total pages to ensure graceful empty result
  const totalPages: number = p1Pages;
  if (totalPages > 0) {
    const farPageNumber = (totalPages + 10) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>;
    const farRequest = {
      ...baseRequest,
      page: farPageNumber,
    } satisfies IShoppingMallRefundAndDisputeStat.IRequest;

    const farResult: IPageIShoppingMallRefundAndDisputeStat.ISummary =
      await api.functional.shoppingMall.admin.analytics.refundAndDisputeStats.index(
        connection,
        { body: farRequest },
      );
    typia.assert(farResult);

    const farPagination = farResult.pagination;
    const farCurrent: number = farPagination.current;
    const farLimit: number = farPagination.limit;
    const farReqPage: number = farRequest.page ?? totalPages + 10;
    const farReqLimit: number = farRequest.limit ?? reqLimit;

    TestValidator.equals(
      "far page current equals requested page when not clamped",
      farCurrent,
      farReqPage,
    );
    TestValidator.equals(
      "far page limit equals request limit",
      farLimit,
      farReqLimit,
    );
    TestValidator.predicate(
      "far page has data size not exceeding limit",
      farResult.data.length <= farLimit,
    );
    if (farCurrent > farPagination.pages) {
      TestValidator.predicate(
        "when requesting beyond last page, data should be empty",
        farResult.data.length === 0,
      );
    }
  }
}
