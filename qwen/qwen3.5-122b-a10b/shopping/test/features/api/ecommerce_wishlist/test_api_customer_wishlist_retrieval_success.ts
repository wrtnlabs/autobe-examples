import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlist";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer successfully retrieves their own wishlist with all saved products.
 *
 * Validates the wishlist retrieval workflow including customer authentication and successful wishlist fetch. Ensures that the wishlist entity is returned with correct metadata, customer ownership is properly validated, and the response structure conforms to the IEcommerceWishlist type.
 *
 * Note: This test assumes the wishlist was auto-created during customer registration. In a complete implementation, products would be added to the wishlist and validated, but the required APIs for product creation and wishlist item management are not available in the current SDK function list.
 *
 * 1. Register a customer account (wishlist auto-created on registration).
 * 2. Retrieve the customer's wishlist by ID.
 * 3. Validate wishlist structure, customer ownership match, and metadata.
 * 4. Verify active status (deleted_at IS NULL) and timestamp fields.
 */
export async function test_api_customer_wishlist_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer (wishlist auto-created on registration)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Retrieve wishlist
  // Note: In a complete implementation, the wishlist ID would be obtained from:
  // - Customer registration response (wishlist auto-created)
  // - A wishlist list endpoint
  // For this test, we use the customer ID as a placeholder for wishlist ID
  // This should be replaced with actual wishlist ID retrieval in production
  const wishlistId: string & tags.Format<"uuid"> = customerAuth.id as any;
  const wishlist = await api.functional.ecommerce.customer.wishlists.at(
    customerConnection,
    { wishlistId },
  );
  typia.assert(wishlist);
  // 3. Validate wishlist structure and ownership
  TestValidator.equals(
    "wishlist ID is valid UUID",
    typeof wishlist.id,
    "string",
  );
  TestValidator.equals(
    "customer ID matches authenticated customer",
    wishlist.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer display name matches",
    wishlist.customer.display_name,
    customerAuth.display_name,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    wishlist.created_at !== null,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    wishlist.updated_at !== null,
  );
  TestValidator.predicate(
    "wishlist is active (not deleted)",
    wishlist.deleted_at === null,
  );
  // 4. Validate wishlist items structure
  TestValidator.predicate(
    "wishlist items is an array",
    Array.isArray(wishlist.items),
  );
  // Validate each item in the wishlist
  for (const item of wishlist.items) {
    typia.assert(item);
    TestValidator.predicate("item has valid ID", typeof item.id === "string");
    TestValidator.predicate(
      "item has product reference",
      item.ecommerceProduct !== null,
    );
    TestValidator.predicate(
      "item is active (not deleted)",
      item.deleted_at === null,
    );
    // Validate product summary structure
    TestValidator.predicate(
      "product has valid ID",
      typeof item.ecommerceProduct.id === "string",
    );
    TestValidator.predicate(
      "product has name",
      typeof item.ecommerceProduct.name === "string",
    );
    TestValidator.predicate(
      "product has base price",
      typeof item.ecommerceProduct.base_price === "number",
    );
    TestValidator.predicate(
      "product has seller reference",
      item.ecommerceProduct.seller !== null,
    );
    TestValidator.predicate(
      "product has category reference",
      item.ecommerceProduct.category !== null,
    );
  }
}
