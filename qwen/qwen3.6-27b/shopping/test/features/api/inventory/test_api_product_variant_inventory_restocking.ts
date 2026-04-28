import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_products_variants_inventory_adjust } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_inventory_adjust";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_inventory_record } from "../../../prepare/prepare_random_ecommerce_platform_inventory_record";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

export async function test_api_product_variant_inventory_restocking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins to create a product category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IEcommercePlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  const admin: IEcommercePlatformAdmin.IAuthorized = typia.assert(
    await authorize_admin_login(adminConnection, {
      body: {
        email: adminCredentials.email,
        password: adminCredentials.password,
        href: adminCredentials.href,
        referrer: adminCredentials.referrer,
      } satisfies IEcommercePlatformAdmin.ILogin,
    }),
  );
  // 2. Admin creates a product category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  const sellerJoin: IEcommercePlatformSeller.IJoin = {
    email: sellerEmail,
    password: sellerPassword,
    href: sellerHref,
    referrer: sellerReferrer,
  };
  await authorize_seller_join(sellerConnection, { body: sellerJoin });
  // 4. Seller creates a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 5. Seller creates a product variant (stock initialized at 0)
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 6. Seller logs in (fresh session for inventory operation)
  const restockSellerConnection: api.IConnection = { host: connection.host };
  typia.assert(
    await authorize_seller_login(restockSellerConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: sellerHref,
        referrer: sellerReferrer,
      } satisfies IEcommercePlatformSeller.ILogin,
    }),
  );
  // 7. Restock inventory with a positive quantity delta
  const QUANTITY_DELTA = 100;
  const RESTOCK_REASON = "Initial product shipment received";
  const inventoryRecord =
    await generate_random_ecommerce_platform_seller_products_variants_inventory_adjust(
      restockSellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          quantity_delta: QUANTITY_DELTA,
          reason: RESTOCK_REASON,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 8. Validate: ledger entry reflects the correct delta and reason
  TestValidator.equals(
    "quantity_delta matches input",
    inventoryRecord.quantity_delta,
    QUANTITY_DELTA,
  );
  TestValidator.equals(
    "reason matches input",
    inventoryRecord.reason,
    RESTOCK_REASON,
  );
  TestValidator.predicate(
    "created_at timestamp is present",
    () =>
      inventoryRecord.created_at !== null &&
      inventoryRecord.created_at.length > 0,
  );
  // 9. Validate: inventory record references the correct variant
  typia.assert(inventoryRecord.variant);
  TestValidator.equals(
    "variant id matches",
    inventoryRecord.variant.id,
    variant.id,
  );
}
