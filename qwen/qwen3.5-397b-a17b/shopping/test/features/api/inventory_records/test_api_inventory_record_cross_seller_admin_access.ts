import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test administrator cross-seller inventory record access privileges.
 *
 * Validates that administrators have platform-wide access to view inventory records from any seller's product variants, regardless of ownership. This test establishes two separate seller accounts with their own products and verifies that an administrator can access inventory records from Seller A's variant while Seller B also exists in the system with separate ownership.
 *
 * The test confirms that admin authorization properly bypasses seller ownership restrictions, enabling comprehensive inventory oversight and audit capabilities across all sellers on the platform.
 *
 * 1. Administrator registers and authenticates via /shoppingMall/auth/admin/join.
 * 2. Administrator creates a category for product organization.
 * 3. Seller A registers and authenticates via /shoppingMall/auth/seller/join.
 * 4. Seller A creates a product under the administrator-created category.
 * 5. Seller A creates a variant for the product.
 * 6. Seller A creates an inventory record (restock) for the variant.
 * 7. Seller B registers and authenticates via /shoppingMall/auth/seller/join with different credentials.
 * 8. Seller B creates their own product to establish separate ownership context.
 * 9. Administrator retrieves Seller A's inventory record via admin endpoint.
 * 10. Validates response contains complete inventory record data with correct quantityDelta and reason.
 */
export async function test_api_inventory_record_cross_seller_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Administrator creates category
  const category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller A authentication
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAAuth);
  // 4. Seller A creates product
  const sellerAProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerAConnection,
      {
        body: {
          shopping_mall_category_id: category.id,
        },
      },
    );
  typia.assert(sellerAProduct);
  // 5. Seller A creates variant
  const sellerAVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: sellerAProduct.id },
      },
    );
  typia.assert(sellerAVariant);
  // 6. Seller A creates inventory record
  const sellerAInventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerAConnection,
      {
        params: { variantId: sellerAVariant.id },
      },
    );
  typia.assert(sellerAInventoryRecord);
  // 7. Seller B authentication (different seller account)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBAuth);
  // 8. Seller B creates their own product (establishes different ownership)
  const sellerBProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerBConnection,
      {
        body: {
          shopping_mall_category_id: category.id,
        },
      },
    );
  typia.assert(sellerBProduct);
  // 9. Administrator retrieves Seller A's inventory record via admin endpoint
  const adminRetrievedRecord =
    await api.functional.shoppingMall.admin.variants.inventory_records.at(
      adminConnection,
      {
        variantId: sellerAVariant.id,
        recordId: sellerAInventoryRecord.id,
      },
    );
  typia.assert(adminRetrievedRecord);
  // 10. Validate admin can access inventory records across seller boundaries
  TestValidator.equals(
    "inventory record ID matches",
    adminRetrievedRecord.id,
    sellerAInventoryRecord.id,
  );
  TestValidator.equals(
    "quantityDelta matches",
    adminRetrievedRecord.quantityDelta,
    sellerAInventoryRecord.quantityDelta,
  );
  TestValidator.equals(
    "reason matches",
    adminRetrievedRecord.reason,
    sellerAInventoryRecord.reason,
  );
  TestValidator.equals(
    "variant ID matches",
    adminRetrievedRecord.productVariant.id,
    sellerAVariant.id,
  );
  TestValidator.predicate(
    "admin has platform-wide inventory access",
    adminRetrievedRecord !== null,
  );
}