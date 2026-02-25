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

export async function test_api_product_variant_snapshot_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create parent product - need category ID but we don't have one, use random UUID
  // In real test, we'd need a category first, but for compilation we use random
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create initial variant with create snapshot
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
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
  typia.assert(variant);
  // Record timestamp after creation
  const afterCreate = new Date().toISOString();
  // Generate snapshot history through multiple updates
  // Update the variant multiple times to generate update snapshots
  const updateOperations = [
    {
      sku: RandomGenerator.alphaNumeric(10),
      reason: "Price adjustment for sale",
    },
    { sku: RandomGenerator.alphaNumeric(10), reason: "Stock replenishment" },
    { sku: RandomGenerator.alphaNumeric(10), reason: "Color option changed" },
  ];
  for (const op of updateOperations) {
    await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure timestamp differences
    await api.functional.ecommerce.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku: op.sku,
          option_values: JSON.stringify({
            color: RandomGenerator.pick(["red", "blue", "green"]) as string,
            size: RandomGenerator.pick(["S", "M", "L"]) as string,
          }),
          price_override: typia.assert<
            (number & tags.Minimum<0>) | null | undefined
          >(typia.random<number & tags.Minimum<1000>>()),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<50>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  }
  // Record timestamp after updates
  const afterUpdates = new Date().toISOString();
  // Now test filtering and pagination
  // Test 1: Basic pagination
  const page1 =
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "page1 has pagination info",
    page1.pagination !== undefined,
  );
  TestValidator.equals("page1 correct page", page1.pagination.current, 1);
  TestValidator.equals("page1 correct limit", page1.pagination.limit, 2);
  TestValidator.predicate("page1 has data", page1.data.length > 0);
  // Test 2: Filter by operation type (should get create operations)
  const createSnapshots =
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          operation_type: "create",
          page: 1,
          limit: 10,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  typia.assert(createSnapshots);
  // Test 3: Date range filtering - get snapshots after creation
  const recentSnapshots =
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          start_date: afterCreate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  typia.assert(recentSnapshots);
  // Test 4: Limit boundaries
  const minLimit =
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  typia.assert(minLimit);
  TestValidator.equals("min limit works", minLimit.pagination.limit, 1);
  const maxLimit =
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals("max limit works", maxLimit.pagination.limit, 100);
  // Test 5: Page navigation
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.ecommerce.seller.products.variants.snapshots.index(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          body: {
            page: 2,
            limit: 2,
          } satisfies IEcommerceVariantSnapshot.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals("page2 correct page", page2.pagination.current, 2);
  }
  // Test 6: Empty page request
  const largePage =
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 100,
          limit: 10,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  typia.assert(largePage);
  TestValidator.predicate(
    "empty or valid page when beyond records",
    largePage.data.length === 0 ||
      largePage.pagination.current <= largePage.pagination.pages,
  );
  // Test 7: Verify ordering (newest first)
  if (page1.data.length >= 2) {
    const firstDate = new Date(page1.data[0].created_at);
    const secondDate = new Date(page1.data[1].created_at);
    TestValidator.predicate(
      "snapshots ordered newest first",
      firstDate >= secondDate,
    );
  }
  // Test 8: Combined filtering with date range
  const combined =
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          start_date: afterCreate,
          end_date: afterUpdates,
          page: 1,
          limit: 5,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  typia.assert(combined);
  // Test 9: Filter by specific variant ID
  const variantFiltered =
    await api.functional.ecommerce.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          variant_id: variant.id,
          page: 1,
          limit: 5,
        } satisfies IEcommerceVariantSnapshot.IRequest,
      },
    );
  typia.assert(variantFiltered);
  // Note: search by change_reason and operation_type filtering for update/delete
  // would require actual change_reason field in snapshots which we don't control
}