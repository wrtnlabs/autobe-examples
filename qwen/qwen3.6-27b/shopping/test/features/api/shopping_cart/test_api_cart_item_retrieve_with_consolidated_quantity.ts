import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_platform_customer_cart_items_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shopping_cart_item } from "../../../prepare/prepare_random_ecommerce_platform_shopping_cart_item";

/**
 * Verifies that retrieving a shopping cart item returns the correctly consolidated quantity when the same product variant is added multiple times.
 *
 * The test establishes a complete e-commerce workflow: administrator authentication and category creation, seller registration and approval, product and variant creation, followed by customer authentication. The customer then adds a specific product variant to their cart with an initial quantity of 2, and subsequently adds the exact same variant again with a quantity of 3. This triggers the platform's upsert logic, which should merge the entries into a single cart item with a summed quantity of 5.
 *
 * Finally, the test retrieves the consolidated cart item and validates that the quantity correctly reflects the mathematical sum of the individual additions. It also confirms that the product variant reference remains accurately linked to the original variant throughout the consolidation process, ensuring data integrity across repeated cart modifications.
 *
 * 1. Administrator authenticates and creates a product category.
 * 2. Seller registers, gets approved, creates a product, and generates a product variant.
 * 3. Customer registers and adds the product variant to their cart with quantity 2.
 * 4. Customer adds the same product variant to the cart with quantity 3.
 * 5. System consolidates the cart item quantities (2 + 3 = 5).
 * 6. Customer retrieves the consolidated cart item and validates the total quantity and variant reference.
 */
export async function test_api_cart_item_retrieve_with_consolidated_quantity(
  connection: api.IConnection,
) {
  // 1. Administrator authentication for category management and seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration for product and variant creation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Customer registration for shopping cart operations
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Administrator creates a product category required for product classification
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 5. Administrator approves the seller registration to enable product creation
  await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
    adminConnection,
    {
      requestId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        status: "approved",
      } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
    },
  );
  // 6. Seller creates a product assigned to the created category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 7. Seller creates a product variant to be added to the shopping cart
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variant);
  // 8. Customer adds the product variant to the shopping cart with an initial quantity of 2
  const cartItem1 =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerConnection,
      {
        body: { product_variant_id: variant.id, quantity: 2 },
      },
    );
  typia.assert(cartItem1);
  // 9. Customer adds the same product variant again with a quantity of 3, triggering the system's upsert consolidation logic
  const cartItem2 =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerConnection,
      {
        body: { product_variant_id: variant.id, quantity: 3 },
      },
    );
  typia.assert(cartItem2);
  // 10. Retrieve the consolidated cart item using its unique identifier
  const retrievedItem =
    await api.functional.ecommercePlatform.customer.cart_items.at(
      customerConnection,
      {
        cartItemId: cartItem2.id,
      },
    );
  typia.assert(retrievedItem);
  // 11. Validate that the quantities were correctly consolidated (2 + 3 = 5)
  TestValidator.equals(
    "consolidated quantity matches expected sum",
    retrievedItem.quantity,
    5,
  );
  TestValidator.equals(
    "product variant reference remains intact after consolidation",
    retrievedItem.productVariant.id,
    variant.id,
  );
}
