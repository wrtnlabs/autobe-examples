import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate seller product category listing pagination and sorting.
 *
 * Business context:
 *
 * - Admin manages global categories and links them to products.
 * - Seller owns products and needs to see associated categories in a paginated,
 *   sortable list.
 *
 * Steps:
 *
 * 1. Admin joins and logs in.
 * 2. Admin creates multiple categories (at least 6) with distinct sort_order.
 * 3. Seller joins and logs in.
 * 4. Seller creates a product.
 * 5. Admin links all categories to the seller's product.
 * 6. Seller calls PATCH /shoppingMall/seller/products/{productId}/categories with
 *    various IShoppingMallProductCategory.IRequest payloads to validate
 *    pagination, sorting, and metadata.
 */
export async function test_api_seller_product_categories_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Admin logs in (to ensure login endpoint also works and token refreshes)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Admin creates multiple categories with distinct sort_order
  const categoryCount = 6;
  const categories: IShoppingMallCategory[] = [];

  for (let i = 0; i < categoryCount; i++) {
    const createCategoryBody = {
      parent_id: null,
      slug: `cat-${i}-${RandomGenerator.alphaNumeric(8)}`,
      name_en: `Category ${i}`,
      description_en: RandomGenerator.paragraph({ sentences: 3 }),
      status: "active",
      sort_order: (i + 1) as number & tags.Type<"int32">,
      is_leaf: true,
    } satisfies IShoppingMallCategory.ICreate;

    const category: IShoppingMallCategory =
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body: createCategoryBody,
      });
    typia.assert(category);
    categories.push(category);
  }

  // Ensure we have the expected count
  TestValidator.equals(
    "created category count",
    categories.length,
    categoryCount,
  );

  // 4. Seller joins
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // 5. Seller logs in (ensure using login endpoint)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 6. Seller creates a product
  const productCreateBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 7. Switch back to admin (admin must own the product-category linking endpoint)
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  // 8. Admin links all categories to the product
  const productCategoryLinks: IShoppingMallProductCategory[] = [];
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    const linkBody = {
      shopping_mall_category_id: category.id,
      is_primary: i === 0,
    } satisfies IShoppingMallProductCategory.ICreate;

    const link: IShoppingMallProductCategory =
      await api.functional.shoppingMall.admin.products.categories.create(
        connection,
        {
          productId: product.id,
          body: linkBody,
        },
      );
    typia.assert(link);
    productCategoryLinks.push(link);
  }

  TestValidator.equals(
    "linked category count",
    productCategoryLinks.length,
    categories.length,
  );

  // Prepare sorted expectations by sort_order asc and desc
  const expectedAsc = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const expectedDesc = [...expectedAsc].reverse();

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 3 as number & tags.Type<"int32"> & tags.Minimum<1>;

  // 9. Switch to seller for listing categories
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  // Helper to call index
  const callIndex = async (
    pageValue: number & tags.Type<"int32"> & tags.Minimum<1>,
    limitValue: number & tags.Type<"int32"> & tags.Minimum<1>,
    direction: "asc" | "desc",
  ): Promise<IPageIShoppingMallProductCategory.ISummary> => {
    const body = {
      page: pageValue,
      limit: limitValue,
      orderBy: "sort_order",
      orderDirection: direction,
    } satisfies IShoppingMallProductCategory.IRequest;

    const output: IPageIShoppingMallProductCategory.ISummary =
      await api.functional.shoppingMall.seller.products.categories.index(
        connection,
        {
          productId: product.id,
          body,
        },
      );
    typia.assert(output);
    return output;
  };

  // 10. Page 1, asc
  const page1Asc = await callIndex(page, limit, "asc");

  TestValidator.equals(
    "page1 asc current page",
    page1Asc.pagination.current,
    page,
  );
  TestValidator.equals("page1 asc limit", page1Asc.pagination.limit, limit);
  TestValidator.equals(
    "page1 asc records",
    page1Asc.pagination.records,
    categories.length,
  );

  const expectedPages = Math.ceil(categories.length / limit);
  TestValidator.equals(
    "page1 asc pages",
    page1Asc.pagination.pages,
    expectedPages,
  );

  TestValidator.equals(
    "page1 asc count",
    page1Asc.data.length,
    Math.min(limit, categories.length),
  );

  for (let i = 0; i < page1Asc.data.length; i++) {
    const got = page1Asc.data[i];
    const expected = expectedAsc[i];
    TestValidator.equals(
      `page1 asc item ${i} id matches expected sort order position`,
      got.id,
      expected.id,
    );
    TestValidator.equals(
      `page1 asc item ${i} sort_order matches`,
      got.sort_order,
      expected.sort_order,
    );
  }

  // 11. Page 2, asc
  const page2 = (page + 1) as number & tags.Type<"int32"> & tags.Minimum<1>;
  const page2Asc = await callIndex(page2, limit, "asc");

  TestValidator.equals(
    "page2 asc current page",
    page2Asc.pagination.current,
    page2,
  );
  TestValidator.equals("page2 asc limit", page2Asc.pagination.limit, limit);
  TestValidator.equals(
    "page2 asc records",
    page2Asc.pagination.records,
    categories.length,
  );
  TestValidator.equals(
    "page2 asc pages",
    page2Asc.pagination.pages,
    expectedPages,
  );

  const expectedPage2Count = Math.max(
    0,
    Math.min(limit, categories.length - limit),
  );
  TestValidator.equals(
    "page2 asc count",
    page2Asc.data.length,
    expectedPage2Count,
  );

  for (let i = 0; i < page2Asc.data.length; i++) {
    const got = page2Asc.data[i];
    const expected = expectedAsc[limit + i];
    TestValidator.equals(
      `page2 asc item ${i} id matches expected sort order position`,
      got.id,
      expected.id,
    );
    TestValidator.equals(
      `page2 asc item ${i} sort_order matches`,
      got.sort_order,
      expected.sort_order,
    );
  }

  // 12. Page 1, desc
  const page1Desc = await callIndex(page, limit, "desc");

  TestValidator.equals(
    "page1 desc current page",
    page1Desc.pagination.current,
    page,
  );
  TestValidator.equals("page1 desc limit", page1Desc.pagination.limit, limit);
  TestValidator.equals(
    "page1 desc records",
    page1Desc.pagination.records,
    categories.length,
  );
  TestValidator.equals(
    "page1 desc pages",
    page1Desc.pagination.pages,
    expectedPages,
  );

  TestValidator.equals(
    "page1 desc count",
    page1Desc.data.length,
    Math.min(limit, categories.length),
  );

  for (let i = 0; i < page1Desc.data.length; i++) {
    const got = page1Desc.data[i];
    const expected = expectedDesc[i];
    TestValidator.equals(
      `page1 desc item ${i} id matches expected sort order position`,
      got.id,
      expected.id,
    );
    TestValidator.equals(
      `page1 desc item ${i} sort_order matches`,
      got.sort_order,
      expected.sort_order,
    );
  }

  // 13. Out-of-range page (no data but same metadata)
  const outOfRangePage = (expectedPages + 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const outOfRange = await callIndex(outOfRangePage, limit, "asc");

  TestValidator.equals(
    "out-of-range current page echoes request",
    outOfRange.pagination.current,
    outOfRangePage,
  );
  TestValidator.equals(
    "out-of-range limit echoes request",
    outOfRange.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "out-of-range records remain total categories",
    outOfRange.pagination.records,
    categories.length,
  );
  TestValidator.equals(
    "out-of-range pages remain expectedPages",
    outOfRange.pagination.pages,
    expectedPages,
  );
  TestValidator.equals("out-of-range data is empty", outOfRange.data.length, 0);
}
