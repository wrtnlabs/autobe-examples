import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDisputeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDisputeEvent";
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
import type { IShoppingMallDisputeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeEvent";
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
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate dispute event listing pagination, including empty page beyond range.
 *
 * Business flow (simplified from full dependencies):
 *
 * 1. Admin joins and becomes authenticated (token stored on connection).
 * 2. Admin creates a bare-minimum dispute using random but valid data.
 * 3. Admin creates exactly 3 dispute events for that dispute with distinct
 *    event_type and occurred_at values.
 * 4. Admin calls PATCH /shoppingMall/admin/disputes/{disputeCode}/events with
 *    page=1, limit=2 and verifies:
 *
 *    - Data length is 2
 *    - Pagination.limit === 2
 *    - Pagination.records === 3
 *    - Pagination.pages === 2
 *    - Pagination.current === 1
 * 5. Admin calls the same endpoint with page=2, limit=2 and verifies:
 *
 *    - Data length is 1
 *    - Pagination.records === 3
 *    - Pagination.pages === 2
 *    - Pagination.current === 2
 * 6. Admin calls the endpoint with page=3, limit=2 (beyond last page) and
 *    verifies:
 *
 *    - Data length is 0
 *    - Pagination.records === 3
 *    - Pagination.pages === 2
 *    - Pagination.current === 3
 *
 * This confirms stable, predictable pagination behavior, including graceful
 * handling of out-of-range page requests.
 */
export async function test_api_admin_list_dispute_events_pagination_and_empty_page(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration (join) to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16) as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a minimal dispute as admin
  const disputeCreateBody = {
    dispute_code: RandomGenerator.alphaNumeric(12),
    type: "refund_dispute",
    severity: "medium",
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    opened_at: new Date().toISOString(),
    shopping_mall_order_id: null,
    shopping_mall_refund_request_id: null,
    shopping_mall_payment_chargeback_id: null,
    shopping_mall_risk_case_id: null,
  } satisfies IShoppingMallDispute.ICreate;

  const dispute = await api.functional.shoppingMall.admin.disputes.create(
    connection,
    {
      body: disputeCreateBody,
    },
  );
  typia.assert<IShoppingMallDispute>(dispute);

  TestValidator.predicate(
    "dispute_code from response should match creation payload",
    dispute.dispute_code === disputeCreateBody.dispute_code,
  );

  const disputeCode: string = dispute.dispute_code;

  // 3. Create exactly 3 dispute events with distinct occurred_at and event_type
  const baseTime = new Date();
  const createEvent = async (
    index: number,
    eventType: string,
  ): Promise<IShoppingMallDisputeEvent> => {
    const occurredAt = new Date(
      baseTime.getTime() + index * 1000,
    ).toISOString();
    const body = {
      event_type: eventType,
      status_before: null,
      status_after: null,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      occurred_at: occurredAt,
    } satisfies IShoppingMallDisputeEvent.ICreate;

    const event =
      await api.functional.shoppingMall.admin.disputes.events.create(
        connection,
        {
          disputeCode,
          body,
        },
      );
    typia.assert<IShoppingMallDisputeEvent>(event);
    return event;
  };

  const events: IShoppingMallDisputeEvent[] = await ArrayUtil.asyncMap(
    ["created", "note_added", "status_changed"],
    async (eventType, index) => createEvent(index, eventType),
  );

  TestValidator.equals(
    "should have created exactly 3 dispute events",
    events.length,
    3,
  );

  // 4. First page retrieval: page=1, limit=2
  const page1Request = {
    page: 1 as number & tags.Type<"int32">,
    limit: 2 as number & tags.Type<"int32">,
    event_types: undefined,
    occurred_from: null,
    occurred_to: null,
    sort_field: null,
    sort_direction: null,
  } satisfies IShoppingMallDisputeEvent.IRequest;

  const page1 = await api.functional.shoppingMall.admin.disputes.events.index(
    connection,
    {
      disputeCode,
      body: page1Request,
    },
  );
  typia.assert<IPageIShoppingMallDisputeEvent.ISummary>(page1);

  TestValidator.equals(
    "first page should return 2 events",
    page1.data.length,
    2,
  );
  TestValidator.equals(
    "pagination.limit should be 2 on first page",
    page1.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination.records should be 3 on first page",
    page1.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination.pages should be 2 on first page",
    page1.pagination.pages,
    2,
  );
  TestValidator.equals(
    "pagination.current should be 1 on first page",
    page1.pagination.current,
    1,
  );

  // 5. Second page retrieval: page=2, limit=2
  const page2Request = {
    page: 2 as number & tags.Type<"int32">,
    limit: 2 as number & tags.Type<"int32">,
    event_types: undefined,
    occurred_from: null,
    occurred_to: null,
    sort_field: null,
    sort_direction: null,
  } satisfies IShoppingMallDisputeEvent.IRequest;

  const page2 = await api.functional.shoppingMall.admin.disputes.events.index(
    connection,
    {
      disputeCode,
      body: page2Request,
    },
  );
  typia.assert<IPageIShoppingMallDisputeEvent.ISummary>(page2);

  TestValidator.equals(
    "second page should return remaining 1 event",
    page2.data.length,
    1,
  );
  TestValidator.equals(
    "pagination.records should still be 3 on second page",
    page2.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination.pages should still be 2 on second page",
    page2.pagination.pages,
    2,
  );
  TestValidator.equals(
    "pagination.current should be 2 on second page",
    page2.pagination.current,
    2,
  );

  // 6. Out-of-range page retrieval: page=3, limit=2
  const page3Request = {
    page: 3 as number & tags.Type<"int32">,
    limit: 2 as number & tags.Type<"int32">,
    event_types: undefined,
    occurred_from: null,
    occurred_to: null,
    sort_field: null,
    sort_direction: null,
  } satisfies IShoppingMallDisputeEvent.IRequest;

  const page3 = await api.functional.shoppingMall.admin.disputes.events.index(
    connection,
    {
      disputeCode,
      body: page3Request,
    },
  );
  typia.assert<IPageIShoppingMallDisputeEvent.ISummary>(page3);

  TestValidator.equals(
    "third page (out-of-range) should return 0 events",
    page3.data.length,
    0,
  );
  TestValidator.equals(
    "pagination.records should remain 3 on out-of-range page",
    page3.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination.pages should remain 2 on out-of-range page",
    page3.pagination.pages,
    2,
  );
  TestValidator.equals(
    "pagination.current should be 3 on out-of-range page",
    page3.pagination.current,
    3,
  );
}
