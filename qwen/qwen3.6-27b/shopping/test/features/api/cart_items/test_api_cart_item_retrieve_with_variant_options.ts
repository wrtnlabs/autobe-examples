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
 * Test customer cart item retrieval with complete variant option details through relational joins.
 *
 * Validates the complete cart item retrieval flow including administrative setup, seller registration and approval, product creation with variants containing option configurations, customer authentication, cart item creation, and retrieval with full relational data loading. Ensures that the cart item response includes the product variant's SKU code, price, stock quantity, all attribute key-value pairs from product variant options, and the parent product name through proper join operations.
 *
 * Special attention is given to verifying that the nested relational data from product variants, variant options, and parent products are correctly loaded and returned in the cart item response, confirming the join operations work correctly for displaying comprehensive product information to the customer.
 *
 * 1. Administrator authenticates and creates a product category.
 * 2. Seller registers for the platform.
 * 3. Administrator approves the seller registration.
 * 4. Seller authenticates and creates a product in the category.
 * 5. Seller creates a product variant with attribute options.
 * 6. Customer registers and authenticates.
 * 7. Customer adds the product variant to the shopping cart.
 * 8. Customer retrieves the cart item and validates the complete variant option details are loaded through relational joins.
 */
export async function test_api_cart_item_retrieve_with_variant_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "password123",
      href: "https://example.com",
      referrer: "https://referral.com",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  const category =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  // 2. Seller registration
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "S3ll3rP@ss!",
      href: "https://seller-register.example.com",
      referrer: "https://marketplace.example.com/register",
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 3. Admin approves seller
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
    adminConnection,
    {
      requestId: approvalRequestId,
      body: {
        status: "approved",
        reason: null,
      } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
    },
  );
  // 4. Seller login and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuthorized.email,
      password: "S3ll3rP@ss!",
      href: "https://seller-login.example.com",
      referrer: "https://marketplace.example.com",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  const product = await api.functional.ecommercePlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        category_id: category.id,
      } satisfies IEcommercePlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Seller creates product variant with options
  const productVariant =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: ArrayUtil.repeat(3, () =>
            typia.random<IEcommercePlatformProductVariantOption.ICreate>(),
          ),
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(productVariant);
  // 6. Customer registration and authentication
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: "Cust0merP@ss!",
      href: "https://customer-register.example.com",
      referrer: "https://shop.example.com/register",
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: "Cust0merP@ss!",
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  // 7. Customer adds product variant to cart
  const cartItem =
    await api.functional.ecommercePlatform.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: productVariant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommercePlatformShoppingCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 8. Customer retrieves the cart item
  const retrievedCartItem =
    await api.functional.ecommercePlatform.customer.cart_items.at(
      customerConnection,
      {
        cartItemId: cartItem.id,
      },
    );
  typia.assert(retrievedCartItem);
  // Cast productVariant from ISummary to full IEcommercePlatformProductVariant with options
  const fullVariant = typia.assert<IEcommercePlatformProductVariant>(
    retrievedCartItem.productVariant,
  );
  // Validate the cart item has proper variant reference
  TestValidator.equals(
    "cart item variant matches",
    fullVariant.id,
    productVariant.id,
  );
  TestValidator.equals(
    "cart item variant SKU code matches",
    fullVariant.sku_code,
    productVariant.sku_code,
  );
  TestValidator.equals(
    "cart item quantity matches input",
    retrievedCartItem.quantity,
    cartItem.quantity,
  );
  TestValidator.predicate(
    "cart item has product reference",
    fullVariant.product.name !== null,
  );
  TestValidator.predicate(
    "cart item variant has options",
    fullVariant.options.length > 0,
  );
  TestValidator.predicate(
    "cart item variant options have keys and values",
    fullVariant.options.every(
      (opt) => opt.attributeKey !== null && opt.attributeValue !== null,
    ),
  );
  // Validate specific option attributes exist
  const hasColorOption = fullVariant.options.some(
    (opt) => opt.attributeKey.toLowerCase() === "color",
  );
  const hasSizeOption = fullVariant.options.some(
    (opt) => opt.attributeKey.toLowerCase() === "size",
  );
  TestValidator.predicate(
    "variant includes color option attribute",
    hasColorOption,
  );
  TestValidator.predicate(
    "variant includes size option attribute",
    hasSizeOption,
  );
}
