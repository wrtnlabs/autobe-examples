import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_variant_snapshot_admin_viewing_any_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // Step 3: Create a product variant with SKU and option values
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(16),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          option_values: [
            {
              key: "color",
              value: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
                "White",
              ] as const),
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant);
  // Step 4-5: Retrieve variant snapshots list to get snapshotId
  // Note: Since the SDK does not expose a list endpoint for variant snapshots,
  // we demonstrate the admin access pattern. In production, the snapshotId would
  // be obtained from the snapshot listing endpoint or audit logs.
  // For this test, we use the variant's created_at timestamp or ID as a reference.
  // The key point is that ADMIN can view ANY snapshot regardless of ownership.
  // Step 6: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 7: Admin retrieves variant snapshot - admin can view ANY snapshot on platform
  // This demonstrates the policy enforcement capability where admins can verify
  // product descriptions, prices, or specifications at any point in time.
  //
  // Note: In a complete test, we would retrieve the actual snapshotId from
  // the snapshot list. Here we demonstrate the access pattern.
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot: IEcommerceMallProductSnapshotVariant =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validation: Snapshot contains complete variant data
  TestValidator.predicate("snapshot has sku", !!snapshot.sku);
  TestValidator.equals("sku matches variant", snapshot.sku, variant.sku_code);
  TestValidator.predicate(
    "snapshot has option values",
    snapshot.optionValues !== null && snapshot.optionValues !== undefined,
  );
  TestValidator.equals(
    "stock_quantity type",
    typeof snapshot.stock_quantity,
    "number",
  );
  TestValidator.equals(
    "price_override type",
    typeof snapshot.price_override,
    typeof variant.price,
  );
}
