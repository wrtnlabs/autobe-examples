import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test administrator cross-seller inventory record access permissions.
 *
 * Validates that an administrator can view inventory history for variants owned by any seller on the platform, verifying cross-seller access permissions. This test ensures administrators have platform-wide oversight capabilities for inventory management and auditing purposes.
 *
 * The test creates two separate seller accounts, each with their own product and variant. The administrator then attempts to retrieve inventory history for both variants to confirm that admin access is not restricted by seller ownership boundaries.
 *
 * 1. Administrator joins and authenticates with unique credentials.
 * 2. Administrator creates a category for product organization.
 * 3. First seller joins and authenticates with unique credentials.
 * 4. First seller creates a product in the category and adds a variant.
 * 5. Second seller joins and authenticates with different unique credentials.
 * 6. Second seller creates their own product in the same category and adds a variant.
 * 7. Administrator retrieves inventory history for the first seller's variant.
 * 8. Administrator retrieves inventory history for the second seller's variant.
 * 9. Validates both requests succeed and return correct variant ownership information.
 */
export async function test_api_inventory_record_admin_cross_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
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
  // 3. First seller setup
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller1Auth);
  // 4. First seller creates product and variant
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product1);
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product1.id },
      },
    );
  typia.assert(variant1);
  // 5. Second seller setup (different seller account)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller2Auth);
  // 6. Second seller creates product and variant
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product2);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller2Connection,
      {
        params: { productId: product2.id },
      },
    );
  typia.assert(variant2);
  // 7. Administrator retrieves inventory history for first seller's variant
  const inventoryHistory1 =
    await api.functional.shoppingMall.admin.variants.inventory_records.index(
      adminConnection,
      {
        variantId: variant1.id,
        body: {
          take: 100,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventoryHistory1);
  // 8. Administrator retrieves inventory history for second seller's variant
  const inventoryHistory2 =
    await api.functional.shoppingMall.admin.variants.inventory_records.index(
      adminConnection,
      {
        variantId: variant2.id,
        body: {
          take: 100,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventoryHistory2);
  // 9. Validate cross-seller access - verify correct variant ownership in returned records
  // These validate business logic: that records returned match the requested variant
  if (inventoryHistory1.data.length > 0) {
    TestValidator.predicate(
      "first variant ID matches in response",
      inventoryHistory1.data.every(
        (record) => record.productVariant.id === variant1.id,
      ),
    );
    TestValidator.predicate(
      "first variant belongs to first seller's product",
      inventoryHistory1.data.every(
        (record) => record.productVariant.product.id === product1.id,
      ),
    );
  }
  if (inventoryHistory2.data.length > 0) {
    TestValidator.predicate(
      "second variant ID matches in response",
      inventoryHistory2.data.every(
        (record) => record.productVariant.id === variant2.id,
      ),
    );
    TestValidator.predicate(
      "second variant belongs to second seller's product",
      inventoryHistory2.data.every(
        (record) => record.productVariant.product.id === product2.id,
      ),
    );
  }
}
