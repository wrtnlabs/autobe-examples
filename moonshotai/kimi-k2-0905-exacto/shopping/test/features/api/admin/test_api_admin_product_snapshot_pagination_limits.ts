import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test comprehensive pagination handling from minimum to maximum limits.
 *
 * This test validates the administrative product snapshot pagination system,
 * ensuring proper handling of item boundaries (1-100 items), page correlation
 * accuracy, and offset calculations. The test creates multiple products with
 * various snapshots, then systematically tests pagination limits across the
 * full range of supported values.
 *
 * Test covers:
 *
 * 1. Minimum pagination (1 item per page)
 * 2. Maximum pagination (100 items per page)
 * 3. Edge cases around boundary conditions
 * 4. Page correlation and offset calculations
 * 5. Total page count accuracy
 * 6. Data consistency across pagination boundaries
 */
export async function test_api_admin_product_snapshot_pagination_limits(
  connection: api.IConnection,
) {
  // Set up admin authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        firstname: RandomGenerator.name(1),
        lastname: RandomGenerator.name(1),
        adminlevel: "department_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Create seller account for product management
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        business_name: RandomGenerator.name(2),
        business_registration_number: RandomGenerator.alphaNumeric(10),
        tax_id: RandomGenerator.alphaNumeric(9),
        phone: RandomGenerator.mobile(),
        business_type: RandomGenerator.pick([
          "sole_proprietorship",
          "corporation",
          "llc",
        ] as const),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // Create test products
  const products: IShoppingMallProduct[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      return await api.functional.shoppingMall.seller.products.create(
        connection,
        {
          body: {
            sku: RandomGenerator.alphaNumeric(8),
            name: RandomGenerator.name(2),
            description: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 5,
              sentenceMax: 10,
            }),
            price: typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<100> &
                tags.Maximum<10000>
            >(),
            condition: "new",
            weight: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
            weight_unit: "kg",
            track_quantity: true,
            allow_backorder: false,
            is_shipping_required: true,
            is_taxable: true,
            category_id: typia.random<string & tags.Format<"uuid">>(),
            shopping_mall_seller_id: seller.id,
            href: "https://example.com/products/create",
            referrer: "https://example.com/dashboard",
          } satisfies IShoppingMallProduct.ICreate,
        },
      );
    },
  );

  // Create multiple snapshots per product by updating products
  await ArrayUtil.asyncForEach(products, async (product) => {
    await ArrayUtil.asyncRepeat(2, async () => {
      await api.functional.shoppingMall.seller.products.update(connection, {
        productCode: product.sku,
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<100> &
              tags.Maximum<10000>
          >(),
        } satisfies IShoppingMallProduct.IUpdate,
      });
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  });

  // Test minimum pagination (1 item per page)
  for (const product of products) {
    const minPage = await api.functional.admin.products.snapshots.index(
      connection,
      {
        productCode: product.sku,
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );

    TestValidator.equals(
      "minimum page limit is 1",
      minPage.pagination.limit,
      1,
    );
    TestValidator.predicate(
      "minimum page has maximum 1 item",
      minPage.data.length <= 1,
    );

    if (minPage.data.length > 0) {
      typia.assert(minPage.data[0]);
      TestValidator.equals(
        "minimum page data has correct product reference",
        minPage.data[0].sku_code,
        product.sku,
      );
    }
  }

  // Test maximum pagination (100 items per page)
  for (const product of products) {
    const maxPage = await api.functional.admin.products.snapshots.index(
      connection,
      {
        productCode: product.sku,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );

    TestValidator.equals(
      "maximum page limit is 100",
      maxPage.pagination.limit,
      100,
    );
    TestValidator.predicate(
      "maximum page has maximum 100 items",
      maxPage.data.length <= 100,
    );

    // Validate all snapshots in page have correct product reference
    maxPage.data.forEach((snapshot) => {
      typia.assert(snapshot);
      TestValidator.equals(
        "maximum page snapshot has correct product reference",
        snapshot.sku_code,
        product.sku,
      );
    });
  }

  // Test boundary conditions (limits around 100)
  for (const product of products) {
    // Test limit = 99 (just below maximum)
    const page99 = await api.functional.admin.products.snapshots.index(
      connection,
      {
        productCode: product.sku,
        body: {
          page: 1,
          limit: 99,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );

    TestValidator.equals(
      "boundary page 99 limit is 99",
      page99.pagination.limit,
      99,
    );
    TestValidator.predicate(
      "boundary page 99 has maximum 99 items",
      page99.data.length <= 99,
    );

    // Test limit = 100 (maximum)
    const page100 = await api.functional.admin.products.snapshots.index(
      connection,
      {
        productCode: product.sku,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );

    TestValidator.equals(
      "boundary page 100 limit is 100",
      page100.pagination.limit,
      100,
    );
    TestValidator.predicate(
      "boundary page 100 has maximum 100 items",
      page100.data.length <= 100,
    );
  }

  // Test page correlation and offset calculations
  for (const product of products) {
    // Get all snapshots for comparison
    const allSnapshots = await api.functional.admin.products.snapshots.index(
      connection,
      {
        productCode: product.sku,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );

    if (allSnapshots.data.length > 1) {
      // Test pagination correlation
      const page1 = await api.functional.admin.products.snapshots.index(
        connection,
        {
          productCode: product.sku,
          body: {
            page: 1,
            limit: 1,
          } satisfies IShoppingMallProductSnapshot.IRequest,
        },
      );

      const page2 = await api.functional.admin.products.snapshots.index(
        connection,
        {
          productCode: product.sku,
          body: {
            page: 2,
            limit: 1,
          } satisfies IShoppingMallProductSnapshot.IRequest,
        },
      );

      if (page1.data.length > 0 && page2.data.length > 0) {
        TestValidator.notEquals(
          "pagination page 1 and 2 have different snapshots",
          page1.data[0].id,
          page2.data[0].id,
        );
        TestValidator.notEquals(
          "pagination page 1 and 2 have different timestamps",
          page1.data[0].snapshot_created_at,
          page2.data[0].snapshot_created_at,
        );
      }
    }
  }

  // Test total page count accuracy
  for (const product of products) {
    // Get snapshots with limit 10 to test page count calculation
    const pageWithLimit10 = await api.functional.admin.products.snapshots.index(
      connection,
      {
        productCode: product.sku,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );

    // Get all snapshots to verify total count
    const allSnapshots = await api.functional.admin.products.snapshots.index(
      connection,
      {
        productCode: product.sku,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );

    // Calculate expected page count
    const expectedPages = Math.ceil(allSnapshots.data.length / 10);
    TestValidator.equals(
      "pagination records match total snapshots",
      pageWithLimit10.pagination.records,
      allSnapshots.data.length,
    );
    TestValidator.predicate(
      "pagination pages calculation is correct",
      pageWithLimit10.pagination.pages >= expectedPages,
    );
  }

  // Test data consistency across pagination
  for (const product of products) {
    const limit = 5;
    const page1 = await api.functional.admin.products.snapshots.index(
      connection,
      {
        productCode: product.sku,
        body: {
          page: 1,
          limit: limit,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );

    if (page1.pagination.pages > 1) {
      const page2 = await api.functional.admin.products.snapshots.index(
        connection,
        {
          productCode: product.sku,
          body: {
            page: 2,
            limit: limit,
          } satisfies IShoppingMallProductSnapshot.IRequest,
        },
      );

      // Ensure no overlapping data between pages
      const page1Ids = new Set(page1.data.map((s) => s.id));
      const page2Ids = new Set(page2.data.map((s) => s.id));

      const overlap = ArrayUtil.has([...page1Ids], (id) => page2Ids.has(id));
      TestValidator.predicate(
        "pagination data consistency - no overlap between pages",
        !overlap,
      );
    }
  }

  // Test edge case: empty results
  for (const product of products) {
    // Request page beyond available data
    const beyondPage = await api.functional.admin.products.snapshots.index(
      connection,
      {
        productCode: product.sku,
        body: {
          page: 999,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );

    TestValidator.equals(
      "beyond page returns no data",
      beyondPage.data.length,
      0,
    );
    TestValidator.predicate(
      "beyond page respects pagination bounds",
      beyondPage.pagination.current <= beyondPage.pagination.pages,
    );
  }
}
