import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDisputeParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDisputeParty";
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
import type { IShoppingMallDisputeParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeParty";
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

export async function test_api_admin_dispute_parties_pagination_behavior(
  connection: api.IConnection,
) {
  // 1. Admin registration and login to get authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // Ensure subsequent calls use admin token (SDK already set Authorization header)

  // 2. Minimal environment setup to reach a state where a dispute can be created.
  // NOTE: The scenario description mentions many domain entities, but we only
  // have a single POST /shoppingMall/admin/disputes API that accepts
  // IShoppingMallDispute.ICreate. Its fields do not require us to actually
  // create orders, payments, etc., so we create a self-contained dispute using
  // only the DTO fields that exist.

  const disputeCreateBody = {
    // Optional business-visible code, let backend auto-generate by sending null
    dispute_code: null,
    type: "refund_dispute",
    severity: "high",
    summary: "Pagination behavior test dispute",
    description: "Dispute created for testing pagination of dispute parties.",
    opened_at: null,
    shopping_mall_order_id: null,
    shopping_mall_refund_request_id: null,
    shopping_mall_payment_chargeback_id: null,
    shopping_mall_risk_case_id: null,
  } satisfies IShoppingMallDispute.ICreate;

  const dispute: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.create(connection, {
      body: disputeCreateBody,
    });
  typia.assert(dispute);

  const disputeCode: string = dispute.dispute_code;

  // 3. Create multiple dispute parties (25) with varying actor_type and role.
  const actorTypes = ["customer", "seller", "admin", "external"] as const;
  const roles = ["complainant", "respondent", "witness", "observer"] as const;

  const createdPartyIds: string[] = [];

  const partyCount = 25;
  for (let i = 0; i < partyCount; i++) {
    const actor_type = RandomGenerator.pick(actorTypes);
    const role = RandomGenerator.pick(roles);

    const partyCreateBody = {
      actor_type,
      role,
      display_name: RandomGenerator.name(2),
      customer_id: null,
      seller_id: null,
      admin_id: null,
    } satisfies IShoppingMallDisputeParty.ICreate;

    const party: IShoppingMallDisputeParty =
      await api.functional.shoppingMall.admin.disputes.parties.create(
        connection,
        {
          disputeCode,
          body: partyCreateBody,
        },
      );
    typia.assert(party);
    createdPartyIds.push(party.id);
  }

  // Ensure we have partyCount unique IDs
  const uniqueCreatedIds = Array.from(new Set(createdPartyIds));
  TestValidator.equals(
    "created party ids should be unique",
    uniqueCreatedIds.length,
    createdPartyIds.length,
  );

  // 4. Helper to call index with given page/limit and return page summary.
  const fetchPage = async (
    page: number,
    limit: number,
  ): Promise<IPageIShoppingMallDisputeParty.ISummary> => {
    const body = {
      page,
      limit,
      actor_type: null,
      role: null,
      display_name: null,
    } satisfies IShoppingMallDisputeParty.IRequest;

    const pageResult =
      await api.functional.shoppingMall.admin.disputes.parties.index(
        connection,
        {
          disputeCode,
          body,
        },
      );
    typia.assert(pageResult);
    return pageResult;
  };

  // 5. Fetch first three pages with limit=10
  const page1 = await fetchPage(1, 10);
  const page2 = await fetchPage(2, 10);
  const page3 = await fetchPage(3, 10);

  const p1 = page1.pagination;
  const p2 = page2.pagination;
  const p3 = page3.pagination;

  // Basic pagination sanity checks
  TestValidator.equals("page 1 current should be 1", p1.current, 1);
  TestValidator.equals("page 2 current should be 2", p2.current, 2);
  TestValidator.equals("page 3 current should be 3", p3.current, 3);

  TestValidator.equals("limit should be 10", p1.limit, 10);
  TestValidator.equals("limit should be 10 on page 2", p2.limit, 10);
  TestValidator.equals("limit should be 10 on page 3", p3.limit, 10);

  // Total records should be >= created parties (some systems may have preexisting parties, so check at least)
  TestValidator.predicate(
    "records should be at least the number of created parties",
    p1.records >= partyCount,
  );

  // Pages should be consistent across calls
  TestValidator.equals(
    "pages metadata should be consistent",
    p1.pages,
    p2.pages,
  );
  TestValidator.equals(
    "pages metadata should be consistent across page3",
    p1.pages,
    p3.pages,
  );

  // 6. Collect ids from first 3 pages and ensure no overlap between pages.
  const ids1 = page1.data.map((p) => p.id);
  const ids2 = page2.data.map((p) => p.id);
  const ids3 = page3.data.map((p) => p.id);

  const set1 = new Set(ids1);
  const set2 = new Set(ids2);
  const set3 = new Set(ids3);

  const intersection12 = ids1.filter((id) => set2.has(id));
  const intersection13 = ids1.filter((id) => set3.has(id));
  const intersection23 = ids2.filter((id) => set3.has(id));

  TestValidator.equals(
    "page 1 and 2 should not have overlapping ids",
    intersection12.length,
    0,
  );
  TestValidator.equals(
    "page 1 and 3 should not have overlapping ids",
    intersection13.length,
    0,
  );
  TestValidator.equals(
    "page 2 and 3 should not have overlapping ids",
    intersection23.length,
    0,
  );

  // 7. Confirm that combining ids across pages covers at least all created ids (up to the pagination window).
  const combinedIds = [...ids1, ...ids2, ...ids3];
  const uniqueCombinedIds = Array.from(new Set(combinedIds));

  // Since there might be preexisting parties, we check that all created ids are included in the combined set
  const missingCreatedIds = uniqueCreatedIds.filter(
    (id) => !uniqueCombinedIds.includes(id),
  );

  TestValidator.equals(
    "all created party ids should be present in combined paginated results",
    missingCreatedIds.length,
    0,
  );

  // 8. Request page beyond last pages+1 and expect empty data but stable metadata.
  const lastPageNumber = p1.pages;
  const beyondPage = lastPageNumber + 1;

  const beyond = await fetchPage(beyondPage, 10);
  const bp = beyond.pagination;

  TestValidator.equals(
    "beyond page current should equal requested page number",
    bp.current,
    beyondPage,
  );
  TestValidator.equals(
    "beyond page pages metadata should remain same",
    bp.pages,
    p1.pages,
  );
  TestValidator.equals(
    "beyond page records metadata should remain same",
    bp.records,
    p1.records,
  );
  TestValidator.equals(
    "beyond page should have empty data array",
    beyond.data.length,
    0,
  );

  // 9. Ensure pagination ordering is stable for repeated calls with same parameters
  const page1Again = await fetchPage(1, 10);
  const ids1Again = page1Again.data.map((p) => p.id);

  TestValidator.equals(
    "page 1 repeated call should return the same ids in the same order",
    ids1Again,
    ids1,
  );
}
