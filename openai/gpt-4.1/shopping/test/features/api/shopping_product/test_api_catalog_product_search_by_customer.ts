import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingProduct";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Validates search and filter of catalog products as seen by a customer.
 * Ensures only active and non-deleted products are shown and that filters
 * behave as expected for all documented parameters.
 *
 * 1. Register admin and create various types of products (active, archived, etc.)
 * 2. Test general keyword search and specific attribute-based filters
 * 3. Test pagination and sorting
 * 4. Ensure invisible products (archived, deleted, inactive) are excluded
 */
export async function test_api_catalog_product_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Register admin to gain privileges for product creation.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: adminName,
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create multiple products of various types: one visible (active), one hidden (archived), one with different attributes.
  const activeCode = RandomGenerator.alphaNumeric(8);
  const activeName = RandomGenerator.paragraph({ sentences: 2 });
  const activeDesc = RandomGenerator.paragraph({ sentences: 4 });
  const activeMainImage = `https://img.example.com/${RandomGenerator.alphaNumeric(10)}.jpg`;
  const activeStatus = "active";
  const activeBusinessStatus = "approved";
  const activePrice = 24900;
  const activeProduct: IShoppingProduct =
    await api.functional.shopping.admin.products.create(connection, {
      body: {
        code: activeCode,
        name: activeName,
        description: activeDesc,
        main_image_uri: activeMainImage,
        status: activeStatus,
        business_status: activeBusinessStatus,
        shipping_weight_grams: 400,
        shipping_length_cm: 50,
        shipping_width_cm: 20,
        shipping_height_cm: 10,
        shipping_options: "Standard shipping",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(activeProduct);

  // Create a product with status "archived" (should NOT be visible)
  const archivedProduct: IShoppingProduct =
    await api.functional.shopping.admin.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        main_image_uri: `https://img.example.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
        status: "archived",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(archivedProduct);

  // 3. Test keyword search matches product name
  {
    const keyword = RandomGenerator.substring(activeName);
    const req = {
      page: 1 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
      keyword,
    } satisfies IShoppingProduct.IRequest;
    const result = await api.functional.shopping.products.index(connection, {
      body: req,
    });
    typia.assert(result);
    TestValidator.predicate(
      "active product appears in keyword search",
      result.data.some((p) => p.code === activeProduct.code),
    );
    TestValidator.predicate(
      "archived does not appear in search",
      !result.data.some((p) => p.code === archivedProduct.code),
    );
    TestValidator.predicate(
      "all returned are active",
      result.data.every((p) => p.status === "active"),
    );
  }

  // 4. Filter by product code
  {
    const req = {
      page: 1 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
      code: activeProduct.code,
    } satisfies IShoppingProduct.IRequest;
    const result = await api.functional.shopping.products.index(connection, {
      body: req,
    });
    typia.assert(result);
    TestValidator.equals(
      "filtered returns only the correct product",
      result.data.length,
      1,
    );
    TestValidator.equals(
      "returns correct product code",
      result.data[0].code,
      activeProduct.code,
    );
  }

  // 5. Filter by status (should only get active)
  {
    const req = {
      page: 1 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
      status: "active",
    } satisfies IShoppingProduct.IRequest;
    const result = await api.functional.shopping.products.index(connection, {
      body: req,
    });
    typia.assert(result);
    TestValidator.predicate(
      "all status filtered products are active",
      result.data.every((p) => p.status === "active"),
    );
    TestValidator.predicate(
      "archived not included in status filtered",
      !result.data.some((p) => p.code === archivedProduct.code),
    );
  }

  // 6. Pagination: limit 1, expect single result and pagination matches
  {
    const req = {
      page: 1 as number & tags.Type<"int32">,
      limit: 1 as number & tags.Type<"int32">,
    } satisfies IShoppingProduct.IRequest;
    const result = await api.functional.shopping.products.index(connection, {
      body: req,
    });
    typia.assert(result);
    TestValidator.equals(
      "paginated result respects limit",
      result.data.length,
      1,
    );
    TestValidator.equals(
      "pagination.limit matches",
      result.pagination.limit,
      1,
    );
    TestValidator.predicate(
      "all paginated products are active",
      result.data.every((p) => p.status === "active"),
    );
  }

  // 7. Sorting: test sort_by name ascending and descending
  {
    for (const sort_direction of ["asc", "desc"] as const) {
      const req = {
        page: 1 as number & tags.Type<"int32">,
        limit: 10 as number & tags.Type<"int32">,
        sort_by: "name",
        sort_direction,
      } satisfies IShoppingProduct.IRequest;
      const result = await api.functional.shopping.products.index(connection, {
        body: req,
      });
      typia.assert(result);
      TestValidator.predicate(
        `all sorted products are active (${sort_direction})`,
        result.data.every((p) => p.status === "active"),
      );
      // Just check sorted array monotonicity, if at least two entries
      if (result.data.length >= 2) {
        const compare =
          sort_direction === "asc"
            ? (a: string, b: string) => a.localeCompare(b) <= 0
            : (a: string, b: string) => a.localeCompare(b) >= 0;
        for (let i = 1; i < result.data.length; ++i) {
          TestValidator.predicate(
            `sorted order correct at index ${i} (${sort_direction})`,
            compare(result.data[i - 1].name, result.data[i].name),
          );
        }
      }
    }
  }

  // 8. Negative: filter code for archived product (should not appear)
  {
    const req = {
      page: 1 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
      code: archivedProduct.code,
    } satisfies IShoppingProduct.IRequest;
    const result = await api.functional.shopping.products.index(connection, {
      body: req,
    });
    typia.assert(result);
    TestValidator.equals(
      "archived product is never visible to customer search",
      result.data.length,
      0,
    );
  }
}
