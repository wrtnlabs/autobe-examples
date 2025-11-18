import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
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
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_seller_search_status_and_date_filters(
  connection: api.IConnection,
) {
  // 1. Admin registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Create two sellers at different times
  const createSeller = async () => {
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    const sellerPassword: string & tags.Format<"password"> =
      RandomGenerator.alphabets(12) as string & tags.Format<"password">;

    const sellerJoinBody = {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerAuthJoin.IRequest;

    const sellerAuthorized: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.join(connection, {
        body: sellerJoinBody,
      });
    typia.assert(sellerAuthorized);
    return sellerAuthorized;
  };

  const seller1 = await createSeller();
  // ensure created_at separation
  await new Promise((resolve) => setTimeout(resolve, 20));
  const seller2 = await createSeller();

  // Re-login as admin because seller.join overwrites Authorization header
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  // 3. Baseline search with no filters
  const baselineRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSeller.IRequest;

  const baselinePage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: baselineRequest,
    });
  typia.assert(baselinePage);

  const baselineIds = baselinePage.data.map((s) => s.id);

  TestValidator.predicate(
    "baseline should include first seller",
    baselineIds.includes(seller1.id),
  );
  TestValidator.predicate(
    "baseline should include second seller",
    baselineIds.includes(seller2.id),
  );

  const seller1Summary = baselinePage.data.find((s) => s.id === seller1.id);
  const seller2Summary = baselinePage.data.find((s) => s.id === seller2.id);

  typia.assertGuard(seller1Summary!);
  typia.assertGuard(seller2Summary!);

  const created1 = seller1Summary!.createdAt;
  const created2 = seller2Summary!.createdAt;

  const created1Date = new Date(created1);
  const created2Date = new Date(created2);

  const midTimestamp = (created1Date.getTime() + created2Date.getTime()) / 2;
  const midIso = new Date(midTimestamp).toISOString();

  const statusValue = seller1Summary!.status;

  // Helper: fetch sellers with given request
  const searchSellers = async (
    body: IShoppingMallSeller.IRequest,
  ): Promise<IPageIShoppingMallSeller.ISummary> => {
    const page = await api.functional.shoppingMall.admin.sellers.index(
      connection,
      { body },
    );
    typia.assert(page);
    return page;
  };

  // 4. Date range tests
  // 4-1. Range including only seller1: createdFrom = created1, createdTo = midIso
  const rangeOnlySeller1Req = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    createdFrom: created1,
    createdTo: midIso,
  } satisfies IShoppingMallSeller.IRequest;

  const rangeOnlySeller1 = await searchSellers(rangeOnlySeller1Req);

  const ids1 = rangeOnlySeller1.data.map((s) => s.id);

  TestValidator.predicate(
    "range [created1, midIso] should include seller1",
    ids1.includes(seller1.id),
  );
  TestValidator.predicate(
    "range [created1, midIso] should not include seller2",
    !ids1.includes(seller2.id),
  );

  // 4-2. Range including only seller2: createdFrom = midIso, createdTo = created2
  const rangeOnlySeller2Req = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    createdFrom: midIso,
    createdTo: created2,
  } satisfies IShoppingMallSeller.IRequest;

  const rangeOnlySeller2 = await searchSellers(rangeOnlySeller2Req);
  const ids2 = rangeOnlySeller2.data.map((s) => s.id);

  TestValidator.predicate(
    "range [midIso, created2] should include seller2",
    ids2.includes(seller2.id),
  );
  TestValidator.predicate(
    "range [midIso, created2] should not include seller1",
    !ids2.includes(seller1.id),
  );

  // 4-3. Range including both sellers
  const rangeBothReq = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    createdFrom: created1,
    createdTo: created2,
  } satisfies IShoppingMallSeller.IRequest;

  const rangeBoth = await searchSellers(rangeBothReq);
  const idsBoth = rangeBoth.data.map((s) => s.id);

  TestValidator.predicate(
    "range [created1, created2] should include seller1",
    idsBoth.includes(seller1.id),
  );
  TestValidator.predicate(
    "range [created1, created2] should include seller2",
    idsBoth.includes(seller2.id),
  );

  // 5. Status filter tests
  const statusMatchReq = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    status: statusValue,
    createdFrom: created1,
    createdTo: created2,
  } satisfies IShoppingMallSeller.IRequest;

  const statusMatchPage = await searchSellers(statusMatchReq);

  TestValidator.predicate(
    "status filter should only return sellers with that status",
    statusMatchPage.data.every((s) => s.status === statusValue),
  );

  const idsStatus = statusMatchPage.data.map((s) => s.id);

  TestValidator.predicate(
    "status filter should include seller1",
    idsStatus.includes(seller1.id),
  );
  TestValidator.predicate(
    "status filter should include seller2",
    idsStatus.includes(seller2.id),
  );

  const nonExistingStatus = "__non_existing_status__";

  const statusMismatchReq = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    status: nonExistingStatus,
    createdFrom: created1,
    createdTo: created2,
  } satisfies IShoppingMallSeller.IRequest;

  const statusMismatchPage = await searchSellers(statusMismatchReq);

  if (statusMismatchPage.data.length === 0) {
    TestValidator.equals(
      "non-existing status may yield empty result",
      statusMismatchPage.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "if any results, they must match the requested status",
      statusMismatchPage.data.every((s) => s.status === nonExistingStatus),
    );
  }

  // 6. Pagination tests
  const extraSellers: IShoppingMallSeller.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const seller = await createSeller();
    extraSellers.push(seller);
  }

  const adminLoginForPagination: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginForPagination);

  const paginationRangeFrom = created1;
  const paginationRangeTo = new Date().toISOString();

  const page1Req = {
    page: 1 as number & tags.Type<"int32">,
    limit: 1 as number & tags.Type<"int32">,
    createdFrom: paginationRangeFrom,
    createdTo: paginationRangeTo,
  } satisfies IShoppingMallSeller.IRequest;

  const page1 = await searchSellers(page1Req);

  TestValidator.equals(
    "page1 current should be 1",
    page1.pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "page1 limit should be 1",
    page1.pagination.limit,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.predicate(
    "page1 should have at most 1 record",
    page1.data.length <= 1,
  );

  if (page1.pagination.records >= 2) {
    const page2Req = {
      page: 2 as number & tags.Type<"int32">,
      limit: 1 as number & tags.Type<"int32">,
      createdFrom: paginationRangeFrom,
      createdTo: paginationRangeTo,
    } satisfies IShoppingMallSeller.IRequest;

    const page2 = await searchSellers(page2Req);

    TestValidator.equals(
      "page2 current should be 2",
      page2.pagination.current,
      2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    );

    if (page2.data.length === 1 && page1.data.length === 1) {
      TestValidator.notEquals(
        "page1 and page2 first seller should differ when records >= 2",
        page1.data[0].id,
        page2.data[0].id,
      );
    }
  }
}
