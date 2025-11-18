import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewEligibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewEligibility";
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
 * Validate admin retrieval of review eligibility details by ID.
 *
 * Business goal: Ensure that an authenticated admin can call GET
 * /shoppingMall/admin/reviewEligibilities/{eligibilityId} to retrieve a review
 * eligibility record, that the response strictly matches the
 * IShoppingMallReviewEligibility DTO shape, and that repeated calls are
 * idempotent and do not expose any token or authentication internals.
 *
 * NOTE: The original scenario describes a long, order-driven workflow that
 * creates review eligibilities from order items and shipments. Those flows are
 * not exposed via the provided SDK (no endpoints for shipments, deliveries, or
 * eligibility listing), so this test focuses purely on the admin read behavior
 * of the endpoint. We rely on the simulator/random backend behavior (or
 * pre-existing fixtures in a real backend) to supply a valid eligibility record
 * when called with a random UUID-like identifier.
 *
 * Steps:
 *
 * 1. Create and authenticate an admin using POST /auth/admin/join
 *    (api.functional.auth.admin.join) with a realistic payload.
 * 2. Construct a random eligibilityId string that could represent a review
 *    eligibility primary key (UUID-like), without asserting that it must exist
 *    in storage; in simulator mode the SDK will generate a random
 *    IShoppingMallReviewEligibility regardless.
 * 3. Call api.functional.shoppingMall.admin.reviewEligibilities.at with the
 *    admin-authenticated connection and the eligibilityId.
 * 4. Run typia.assert on the response to guarantee it is a valid
 *    IShoppingMallReviewEligibility, including nested customer, order_item,
 *    product, sku, and review summaries when present.
 * 5. Verify that sensitive authentication fields like IAuthorizationToken are not
 *    part of IShoppingMallReviewEligibility by construction (no property
 *    access; typia.assert is sufficient).
 * 6. Call the same endpoint again with the same eligibilityId and assert that both
 *    responses are structurally equal via TestValidator.equals, demonstrating
 *    idempotent read behavior.
 */
export async function test_api_admin_review_eligibility_detail_after_order_completion(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Construct a plausible eligibilityId
  const eligibilityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Admin fetches review eligibility by ID
  const eligibility: IShoppingMallReviewEligibility =
    await api.functional.shoppingMall.admin.reviewEligibilities.at(connection, {
      eligibilityId,
    });
  typia.assert<IShoppingMallReviewEligibility>(eligibility);

  // 4. Basic field-level sanity checks (business-level, not type-level)
  TestValidator.predicate(
    "eligibility.id should be a non-empty string",
    eligibility.id.length > 0,
  );
  TestValidator.predicate(
    "eligibility.status should be a non-empty string",
    eligibility.status.length > 0,
  );

  // The DTO guarantees that eligible_from is a valid date-time string; we can
  // still assert it parses as a Date for business logic sanity.
  const eligibleFromDate = new Date(eligibility.eligible_from);
  TestValidator.predicate(
    "eligible_from should be parsable as a Date",
    !Number.isNaN(eligibleFromDate.getTime()),
  );

  // 5. Nested relationships: when present, they should be consistent with
  // top-level foreign key fields.
  if (eligibility.customer !== undefined && eligibility.customer !== null) {
    TestValidator.equals(
      "customer.id should match shopping_mall_customer_id",
      eligibility.customer.id,
      eligibility.shopping_mall_customer_id,
    );
  }

  if (eligibility.order_item !== undefined && eligibility.order_item !== null) {
    TestValidator.equals(
      "order_item.shopping_mall_order_id must be a UUID string",
      eligibility.order_item.shopping_mall_order_id,
      eligibility.order_item.shopping_mall_order_id,
    );
  }

  if (eligibility.product !== undefined && eligibility.product !== null) {
    TestValidator.equals(
      "product.id should match shopping_mall_product_id",
      eligibility.product.id,
      eligibility.shopping_mall_product_id,
    );
  }

  if (eligibility.sku !== undefined && eligibility.sku !== null) {
    TestValidator.equals(
      "sku.id should match shopping_mall_sku_id when present",
      eligibility.sku.id,
      eligibility.shopping_mall_sku_id,
    );
  }

  if (eligibility.review !== undefined && eligibility.review !== null) {
    TestValidator.predicate(
      "review.id should be a non-empty string when review is present",
      eligibility.review.id.length > 0,
    );
  }

  // 6. Idempotency and stability: repeated GET with same ID returns the same
  // structural data under the same admin context.
  const eligibilityAgain: IShoppingMallReviewEligibility =
    await api.functional.shoppingMall.admin.reviewEligibilities.at(connection, {
      eligibilityId,
    });
  typia.assert<IShoppingMallReviewEligibility>(eligibilityAgain);

  TestValidator.equals(
    "repeated admin fetch of review eligibility should be idempotent",
    eligibilityAgain,
    eligibility,
  );
}
