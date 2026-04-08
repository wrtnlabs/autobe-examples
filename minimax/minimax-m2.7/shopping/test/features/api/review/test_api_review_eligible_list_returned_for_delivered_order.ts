import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_review_eligible_list_returned_for_delivered_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Call GET /ecommerceMall/customer/customers/me/reviews/eligible
  // Returns order items eligible for review (delivered, no existing review)
  const eligibleReview =
    await api.functional.ecommerceMall.customer.customers.me.reviews.eligible(
      customerConnection,
    );
  // Validate response structure matches IEcommerceMallReview.IEligible
  typia.assert(eligibleReview);
  // Validate essential fields exist and have proper types
  TestValidator.equals(
    "has orderItemId",
    "orderItemId" in eligibleReview,
    true,
  );
  TestValidator.equals(
    "has orderNumber",
    "orderNumber" in eligibleReview,
    true,
  );
  TestValidator.equals("has productId", "productId" in eligibleReview, true);
  TestValidator.equals(
    "has productName",
    "productName" in eligibleReview,
    true,
  );
  TestValidator.equals(
    "has productImageUrl",
    "productImageUrl" in eligibleReview,
    true,
  );
  TestValidator.equals("has variantId", "variantId" in eligibleReview, true);
  TestValidator.equals("has quantity", "quantity" in eligibleReview, true);
  TestValidator.equals("has unitPrice", "unitPrice" in eligibleReview, true);
  TestValidator.equals("has sellerName", "sellerName" in eligibleReview, true);
  TestValidator.equals(
    "has deliveredAt",
    "deliveredAt" in eligibleReview,
    true,
  );
  // Validate field formats when present
  // orderItemId should be valid UUID format
  if (eligibleReview.orderItemId) {
    TestValidator.predicate(
      "orderItemId is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        eligibleReview.orderItemId,
      ),
    );
  }
  // productId should be valid UUID format
  if (eligibleReview.productId) {
    TestValidator.predicate(
      "productId is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        eligibleReview.productId,
      ),
    );
  }
  // variantId should be valid UUID format
  if (eligibleReview.variantId) {
    TestValidator.predicate(
      "variantId is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        eligibleReview.variantId,
      ),
    );
  }
  // quantity should be positive integer
  if (typeof eligibleReview.quantity === "number") {
    TestValidator.predicate(
      "quantity is positive",
      eligibleReview.quantity > 0,
    );
  }
  // unitPrice should be non-negative
  if (typeof eligibleReview.unitPrice === "number") {
    TestValidator.predicate(
      "unitPrice is non-negative",
      eligibleReview.unitPrice >= 0,
    );
  }
  // sellerName should be non-empty string when present
  if (typeof eligibleReview.sellerName === "string") {
    TestValidator.predicate(
      "sellerName is non-empty",
      eligibleReview.sellerName.length > 0,
    );
  }
  // productName should be non-empty string when present
  if (typeof eligibleReview.productName === "string") {
    TestValidator.predicate(
      "productName is non-empty",
      eligibleReview.productName.length > 0,
    );
  }
  // productImageUrl should be valid URI format when present
  if (typeof eligibleReview.productImageUrl === "string") {
    TestValidator.predicate("productImageUrl is valid URI", () => {
      try {
        new URL(eligibleReview.productImageUrl);
        return true;
      } catch {
        return false;
      }
    });
  }
  // deliveredAt should be valid ISO 8601 datetime when present
  if (typeof eligibleReview.deliveredAt === "string") {
    TestValidator.predicate(
      "deliveredAt is valid ISO datetime",
      !isNaN(Date.parse(eligibleReview.deliveredAt)),
    );
  }
}
