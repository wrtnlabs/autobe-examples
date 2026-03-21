import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotVariant";
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

export async function test_api_admin_variant_snapshots_cross_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. First seller joins and authenticates
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com",
      referrer: "https://google.com",
    },
  });
  // 3. First seller creates product
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 10000,
      },
    },
  );
  // 4. First seller creates variant
  const variant1 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product1.id },
        body: {
          sku_code: `SKU-SELLER1-${RandomGenerator.alphaNumeric(8)}`,
          price: 12000,
          quantity: 50,
          option_values: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  // 5. First seller updates variant to create snapshot
  const updatedVariant1 =
    await api.functional.ecommerceMall.seller.products.variants.update(
      seller1Connection,
      {
        productId: product1.id,
        variantId: variant1.id,
        body: {
          optionValues: [{ value: "Blue" }, { value: "Large" }],
        },
      },
    );
  typia.assert(updatedVariant1);
  // 6. Second seller joins and authenticates
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com",
      referrer: "https://google.com",
    },
  });
  // 7. Second seller creates their own product and variant with snapshot
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 20000,
      },
    },
  );
  const variant2 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      seller2Connection,
      {
        params: { productId: product2.id },
        body: {
          sku_code: `SKU-SELLER2-${RandomGenerator.alphaNumeric(8)}`,
          price: 22000,
          quantity: 30,
          option_values: [{ key: "color", value: "Green" }],
        },
      },
    );
  // Update variant2 to create snapshot
  const updatedVariant2 =
    await api.functional.ecommerceMall.seller.products.variants.update(
      seller2Connection,
      {
        productId: product2.id,
        variantId: variant2.id,
        body: {
          optionValues: [{ value: "Yellow" }],
        },
      },
    );
  typia.assert(updatedVariant2);
  // 8. Admin queries variant snapshots for first seller's product
  const snapshots1 =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product1.id,
        variantId: variant1.id,
        body: {},
      },
    );
  typia.assert(snapshots1);
  // 9. Verify admin can access first seller's variant snapshots
  TestValidator.equals(
    "has snapshots for first seller",
    snapshots1.data.length > 0,
    true,
  );
  // 10. Verify response includes correct seller information from product_snapshot.seller
  const firstSnapshot = snapshots1.data[0];
  TestValidator.equals(
    "seller ID matches first seller",
    firstSnapshot.product_snapshot.seller.id,
    seller1.id,
  );
  TestValidator.equals(
    "seller email matches first seller",
    firstSnapshot.product_snapshot.seller.email,
    seller1.email,
  );
  TestValidator.equals(
    "product name preserved in snapshot",
    firstSnapshot.product_snapshot.name,
    product1.name,
  );
  // 11. Admin queries second seller's variant snapshots using same endpoint
  const snapshots2 =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product2.id,
        variantId: variant2.id,
        body: {},
      },
    );
  typia.assert(snapshots2);
  // 12. Verify different seller data is returned correctly
  TestValidator.equals(
    "has snapshots for second seller",
    snapshots2.data.length > 0,
    true,
  );
  // 13. Validate seller context is preserved and shown in product_snapshot.seller field
  const secondSnapshot = snapshots2.data[0];
  TestValidator.equals(
    "second seller ID matches",
    secondSnapshot.product_snapshot.seller.id,
    seller2.id,
  );
  TestValidator.equals(
    "second seller email matches",
    secondSnapshot.product_snapshot.seller.email,
    seller2.email,
  );
  TestValidator.equals(
    "second product name preserved",
    secondSnapshot.product_snapshot.name,
    product2.name,
  );
  // Verify sellers are different
  TestValidator.notEquals("sellers are different", seller1.id, seller2.id);
  TestValidator.notEquals("products are different", product1.id, product2.id);
}
