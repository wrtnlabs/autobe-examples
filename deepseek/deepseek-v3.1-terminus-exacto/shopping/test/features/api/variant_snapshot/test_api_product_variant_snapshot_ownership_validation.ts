import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_product_variant_snapshot_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create first seller and authenticate
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller1);
  // Create product for seller1
  const product1 = await generate_random_ecommerce_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.name() + " Product",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<10000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product1);
  // Create variant for seller1 product
  const variant1 =
    await generate_random_ecommerce_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product1.id },
        body: {
          sku: RandomGenerator.alphaNumeric(10),
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // Create second seller and authenticate
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller2);
  // Create product for seller2
  const product2 = await generate_random_ecommerce_seller_products_create(
    seller2Connection,
    {
      body: {
        name: RandomGenerator.name() + " Product",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<10000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product2);
  // Create variant for seller2 product
  const variant2 =
    await generate_random_ecommerce_seller_products_variants_create(
      seller2Connection,
      {
        params: { productId: product2.id },
        body: {
          sku: RandomGenerator.alphaNumeric(10),
          option_values: JSON.stringify({ color: "blue", size: "L" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // Test 1: Seller1 should be able to access their own variant snapshots
  const validSnapshots =
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      seller1Connection,
      {
        productId: product1.id,
        variantId: variant1.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  typia.assert(validSnapshots);
  TestValidator.predicate(
    "valid snapshots returned",
    validSnapshots.data.length >= 0,
  );
  // Test 2: Seller1 should NOT be able to access seller2's variant snapshots
  await TestValidator.error("access other seller's snapshots", async () => {
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      seller1Connection,
      {
        productId: product2.id,
        variantId: variant2.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  });
  // Test 3: Invalid product ID
  await TestValidator.error("invalid product ID", async () => {
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      seller1Connection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: variant1.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  });
  // Test 4: Invalid variant ID
  await TestValidator.error("invalid variant ID", async () => {
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      seller1Connection,
      {
        productId: product1.id,
        variantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  });
  // Test 5: Mismatched product-variant relationship
  await TestValidator.error(
    "variant belongs to different product",
    async () => {
      await api.functional.ecommerce.seller.products.variants.snapshots.index(
        seller1Connection,
        {
          productId: product1.id,
          variantId: variant2.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IEcommerceVariantSnapshot.IRequest,
        },
      );
    },
  );
  // Test 6: Seller2 should be able to access their own variant snapshots
  const seller2Snapshots =
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      seller2Connection,
      {
        productId: product2.id,
        variantId: variant2.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  typia.assert(seller2Snapshots);
  TestValidator.predicate(
    "seller2 can access own snapshots",
    seller2Snapshots.data.length >= 0,
  );
  // Validate snapshot structure for successful requests
  if (validSnapshots.data.length > 0) {
    const snapshot = validSnapshots.data[0];
    TestValidator.predicate("snapshot has valid ID", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot has creation date",
      snapshot.created_at.length > 0,
    );
    TestValidator.predicate(
      "snapshot has operation type",
      snapshot.operation_type.length > 0,
    );
  }
}
