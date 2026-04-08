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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_wishlist_create";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

/**
 * Test retrieving a customer's wishlist with multiple products.
 *
 * Validates the complete wishlist retrieval flow including customer authentication,
 * adding multiple products to wishlist, and paginated wishlist retrieval. Ensures
 * that the response contains all wishlist items with complete product information
 * and correct pagination metadata.
 *
 * 1. Customer registers and authenticates via join endpoint.
 * 2. Three different products are added to the customer's wishlist.
 * 3. Wishlist retrieval endpoint is called with default pagination.
 * 4. Response is validated for:
 *    - All 3 wishlist items present in data array
 *    - Each item contains wishlist item ID and creation timestamp
 *    - Each item includes nested product summary with id, name, basePrice, categoryName, hasStock, seller, createdAt, updatedAt
 *    - Pagination metadata shows total=3, current=1, limit=20, pages=1
 *    - Items are sorted by creation date (newest first)
 */
export async function test_api_wishlist_retrieval_with_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerAuth = await authorize_customer_join(connection, {});
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // 2. Add 3 different products to wishlist
  const wishlistItems = await ArrayUtil.asyncRepeat(3, async () => {
    const item =
      await generate_random_ecommerce_mall_customer_customers_me_wishlist_create(
        customerConnection,
        {},
      );
    typia.assert(item);
    return item;
  });
  // 3. Call PATCH /ecommerceMall/customer/wishlist with default pagination
  const response = await api.functional.ecommerceMall.customer.wishlist.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallWishlistItem.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate response returns paginated list with all 3 wishlist items
  TestValidator.equals("total wishlist items", response.data.length, 3);
  // 5. Verify each item includes wishlist item ID, creation timestamp, and nested product summary
  for (const item of response.data) {
    // Validate wishlist item ID exists and is valid UUID
    TestValidator.predicate(
      "wishlist item has valid id",
      /^[0-9a-f-]{36}$/i.test(item.id),
    );
    // Validate creation timestamp exists
    TestValidator.predicate(
      "wishlist item has creation timestamp",
      item.created_at !== undefined && item.created_at !== null,
    );
    // Validate nested product summary
    TestValidator.predicate(
      "product summary exists",
      item.product !== undefined && item.product !== null,
    );
    // Validate product id
    TestValidator.predicate(
      "product has valid id",
      /^[0-9a-f-]{36}$/i.test(item.product.id),
    );
    // Validate product name
    TestValidator.predicate(
      "product has name",
      item.product.name !== undefined && item.product.name.length > 0,
    );
    // Validate product basePrice
    TestValidator.predicate(
      "product has basePrice",
      typeof item.product.basePrice === "number",
    );
    // Validate product categoryName
    TestValidator.predicate(
      "product has categoryName",
      item.product.categoryName !== undefined,
    );
    // Validate product hasStock
    TestValidator.predicate(
      "product has hasStock boolean",
      typeof item.product.hasStock === "boolean",
    );
    // Validate product timestamps
    TestValidator.predicate(
      "product has createdAt",
      item.product.createdAt !== undefined,
    );
    TestValidator.predicate(
      "product has updatedAt",
      item.product.updatedAt !== undefined,
    );
  }
  // 6. Verify pagination metadata shows total=3, current=1, limit=20, pages=1
  TestValidator.equals("pagination total", response.pagination.records, 3);
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  // 7. Verify items are sorted by creation date (newest first)
  for (let i = 1; i < response.data.length; i++) {
    const current = new Date(response.data[i].created_at).getTime();
    const previous = new Date(response.data[i - 1].created_at).getTime();
    TestValidator.predicate(
      "items sorted by creation date (newest first)",
      current <= previous,
    );
  }
}
