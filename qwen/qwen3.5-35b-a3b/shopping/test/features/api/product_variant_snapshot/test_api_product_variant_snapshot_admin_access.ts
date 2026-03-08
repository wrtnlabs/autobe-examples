import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_variant_snapshot_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: typia.random<IEcommerceMallSeller.IJoin>(),
    },
  );
  typia.assert(seller);
  // 2. Create a variant with an existing product (product must be pre-existing or created through seller)
  // Since product creation isn't available in the SDK, we'll work with a product ID
  // In a real scenario, this product would be created by the seller first
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a variant for the product
  const variant: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId,
        body: {
          sku_code: typia.random<string & tags.MaxLength<50>>(),
          option_values: { color: "Red", size: "Large" },
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Edit the variant to create a snapshot
  const updatedVariant: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId,
        variantId: variant.id,
        body: {
          sku_code: typia.random<string & tags.MaxLength<50>>(),
          price_override: typia.random<number | null>(),
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: typia.random<IEcommerceMallAdmin.IJoin>(),
    },
  );
  typia.assert(admin);
  // 6. Retrieve the variant snapshot (admin can access any product's snapshots)
  const snapshot: IEcommerceMallProductVariantSnapshot =
    await api.functional.ecommerceMall.products.variant_snapshots.at(
      adminConnection,
      {
        productId,
        snapshotId: variant.id, // Using variant.id as snapshot reference
      },
    );
  typia.assert(snapshot);
  // 7. Validate admin can access seller's snapshot data
  TestValidator.equals("snapshot is accessible", snapshot.id, variant.id);
  TestValidator.equals(
    "snapshot contains sku_code",
    snapshot.skuCode,
    updatedVariant.skuCode,
  );
  TestValidator.equals(
    "snapshot preserves stock quantity",
    snapshot.stockQuantity,
    updatedVariant.stockQuantity,
  );
  TestValidator.equals(
    "snapshot preserves active status",
    snapshot.isActive,
    updatedVariant.isActive,
  );
  TestValidator.equals(
    "snapshot contains variant reference",
    snapshot.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "snapshot contains product reference",
    snapshot.product.id,
    productId,
  );
}
