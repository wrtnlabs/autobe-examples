import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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

/**
 * Test successful retrieval of a wishlist item by the customer who owns it.
 */
export async function test_api_wishlist_item_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the system to create an account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Retrieve wishlist item by owner (using pre-generated ID for test)
  const wishlistItemId = typia.random<string & tags.Format<"uuid">>();
  const wishlistItem =
    await api.functional.ecommerceMall.customer.wishlist_items.at(
      customerConnection,
      { wishlistItemId },
    );
  typia.assert(wishlistItem);
  // 3. Validate wishlist item belongs to the requesting customer
  TestValidator.equals(
    "customer ID matches",
    wishlistItem.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    wishlistItem.customer.email,
    customerAuth.email,
  );
  // 4. Validate product information completeness
  TestValidator.equals(
    "product name exists",
    wishlistItem.product.name.length > 0,
    true,
  );
  TestValidator.predicate(
    "product has base price",
    wishlistItem.product.base_price > 0,
  );
  TestValidator.equals(
    "product slug exists",
    wishlistItem.product.slug.length > 0,
    true,
  );
  TestValidator.equals(
    "product status exists",
    wishlistItem.product.status.length > 0,
    true,
  );
  TestValidator.predicate(
    "product category exists",
    wishlistItem.product.category !== undefined &&
      wishlistItem.product.category.id !== undefined,
  );
  // 5. Validate created_at timestamp
  const createdAt = new Date(wishlistItem.created_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  // 6. Validate deleted_at is null (active)
  TestValidator.equals("deleted_at is null", wishlistItem.deleted_at, null);
  // 7. Validate all expected fields exist
  TestValidator.equals(
    "response has id",
    typeof wishlistItem.id === "string",
    true,
  );
  TestValidator.equals(
    "response has customer",
    wishlistItem.customer !== undefined,
    true,
  );
  TestValidator.equals(
    "response has product",
    wishlistItem.product !== undefined,
    true,
  );
  TestValidator.equals(
    "response has created_at",
    typeof wishlistItem.created_at === "string",
    true,
  );
  TestValidator.equals(
    "response has updated_at",
    typeof wishlistItem.updated_at === "string",
    true,
  );
  TestValidator.equals(
    "response has deleted_at",
    wishlistItem.deleted_at !== undefined,
    true,
  );
  // 8. Validate customer summary fields
  TestValidator.equals(
    "customer has id",
    typeof wishlistItem.customer.id === "string",
    true,
  );
  TestValidator.equals(
    "customer has email",
    typeof wishlistItem.customer.email === "string",
    true,
  );
  TestValidator.equals(
    "customer has status",
    typeof wishlistItem.customer.status === "string",
    true,
  );
  TestValidator.equals(
    "customer has created_at",
    typeof wishlistItem.customer.created_at === "string",
    true,
  );
  TestValidator.equals(
    "customer has deleted_at",
    wishlistItem.customer.deleted_at !== undefined,
    true,
  );
  // 9. Validate product summary fields
  TestValidator.equals(
    "product has id",
    typeof wishlistItem.product.id === "string",
    true,
  );
  TestValidator.equals(
    "product has name",
    typeof wishlistItem.product.name === "string",
    true,
  );
  TestValidator.equals(
    "product has base_price",
    typeof wishlistItem.product.base_price === "number",
    true,
  );
  TestValidator.equals(
    "product has slug",
    typeof wishlistItem.product.slug === "string",
    true,
  );
  TestValidator.equals(
    "product has status",
    typeof wishlistItem.product.status === "string",
    true,
  );
  TestValidator.equals(
    "product has category",
    wishlistItem.product.category !== undefined,
    true,
  );
  // 10. Validate category summary fields
  TestValidator.equals(
    "category has id",
    typeof wishlistItem.product.category.id === "string",
    true,
  );
  TestValidator.equals(
    "category has name",
    typeof wishlistItem.product.category.name === "string",
    true,
  );
  TestValidator.equals(
    "category has slug",
    typeof wishlistItem.product.category.slug === "string",
    true,
  );
}
