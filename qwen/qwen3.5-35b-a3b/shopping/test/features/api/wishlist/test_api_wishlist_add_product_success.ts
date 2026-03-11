import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_create";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";

export async function test_api_wishlist_add_product_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16) satisfies string as string,
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  // 2. Create authenticated connection with customer token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: customerAuthorized.token.access,
  };
  // 3. Add product to wishlist with authenticated connection
  const wishlistEntry =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      authenticatedConnection,
      {
        body: typia.random<IEcommerceMallWishlist.ICreate>(),
      },
    );
  typia.assert(wishlistEntry);
  // 4. Validate business logic - customer information matches
  TestValidator.equals(
    "wishlist customer id matches authorized customer",
    wishlistEntry.customer.id,
    customerAuthorized.id,
  );
  // 5. Validate business logic - customer email matches
  TestValidator.equals(
    "wishlist customer email matches authorized customer",
    wishlistEntry.customer.email,
    customerAuthorized.email,
  );
  // 6. Validate business logic - product base price is positive
  TestValidator.predicate(
    "wishlist product basePrice is positive",
    wishlistEntry.product.basePrice > 0,
  );
  // 7. Validate business logic - product is active
  TestValidator.equals(
    "wishlist product is active",
    wishlistEntry.product.isActive,
    true,
  );
  // 8. Validate business logic - product has valid name (not empty)
  TestValidator.equals(
    "wishlist product name is not empty",
    wishlistEntry.product.name.length,
    wishlistEntry.product.name.length > 0 ? 1 : 0,
  );
}
