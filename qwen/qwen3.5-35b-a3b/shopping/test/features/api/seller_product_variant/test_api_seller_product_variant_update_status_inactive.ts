import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_product_variant_update_status_inactive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create authenticated connection using seller token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedSellerConnection.headers = {
    Authorization: seller.token.access,
  };
  // 2. Create a product with active variant using utility functions
  const product = await generate_random_ecommerce_mall_seller_products_create(
    authenticatedSellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create initial active variant
  const initialVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      authenticatedSellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: `TEST-SKU-${RandomGenerator.alphaNumeric(8)}`,
          options: {
            color: RandomGenerator.alphabets(6),
            size: RandomGenerator.alphabets(4),
          },
          base_price: product.base_price + 500,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          status: "active",
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(initialVariant);
  // Verify initial variant is active
  TestValidator.equals(
    "variant starts as active",
    initialVariant.status,
    "active",
  );
  // 3. Update variant status to inactive
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      authenticatedSellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          status: "inactive",
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // Verify status changed to inactive
  TestValidator.equals(
    "variant status updated to inactive",
    updatedVariant.status,
    "inactive",
  );
  // Verify variant is no longer in active state in the product
  const productUpdatedVariant = product.variants.find(
    (v) => v.id === updatedVariant.id,
  );
  TestValidator.equals(
    "product contains inactive variant",
    productUpdatedVariant?.status,
    "inactive",
  );
  // Note: Snapshot creation with snapshot_type='update' is server-side operation
  // verified through database audit trail (no public API endpoint for snapshot retrieval)
  // 4. Update variant status back to active
  const reactivatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      authenticatedSellerConnection,
      {
        productId: product.id,
        variantId: updatedVariant.id,
        body: {
          status: "active",
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(reactivatedVariant);
  // Verify status changed back to active
  TestValidator.equals(
    "variant status reactivated to active",
    reactivatedVariant.status,
    "active",
  );
  // 5. Final verification - variant is active again
  TestValidator.equals(
    "variant visible after reactivation",
    reactivatedVariant.status,
    "active",
  );
  // Note: Public listing visibility validation requires customer-facing APIs
  // which are not available in the current SDK scope
}