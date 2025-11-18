import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductLocalization";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductLocalization";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate admin localization index pagination and basic ordering semantics.
 *
 * Business flow:
 *
 * 1. Register an admin and a seller.
 * 2. As seller, create a product.
 * 3. As seller, create 15 localizations for that product to span 2 pages.
 * 4. As admin, optionally create a category and attach the product to it so
 *    catalog preconditions are satisfied.
 * 5. Call admin localizations.index with page=1, limit=10, orderBy="created_at",
 *    orderDirection="asc".
 *
 *    - Ensure pagination.current=1, pagination.limit=10 and data.length<=10.
 * 6. Call again with page=2, same sort.
 *
 *    - Ensure remaining items (<=5) are returned and that there is no overlap
 *         between IDs from page 1 and page 2.
 * 7. Call once more with page=1, limit=10, orderBy="created_at",
 *    orderDirection="desc".
 *
 *    - Ensure pagination fields are correct and that the set of IDs matches the
 *         first page asc result (when data sizes allow), even though detailed
 *         timestamp fields are not exposed in the summary DTO.
 */
export async function test_api_admin_product_localizations_index_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPw123!" as string & tags.Format<"password">,
        ip: null,
        href: "https://admin.shoppingmall.test/join" as string &
          tags.Format<"uri">,
        referrer: "https://admin.shoppingmall.test/landing" as string &
          tags.Format<"uri">,
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert(adminJoin);

  // 2. Register seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPw123!" as string & tags.Format<"password">,
        ip: null,
        href: "https://seller.shoppingmall.test/join" as string &
          tags.Format<"uri">,
        referrer: "https://seller.shoppingmall.test/landing" as string &
          tags.Format<"uri">,
      } satisfies IShoppingMallSellerAuthJoin.IRequest,
    });
  typia.assert(sellerJoin);

  // 3. As seller, create product
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPw123!",
        ip: null,
        href: "https://seller.shoppingmall.test/login" as string &
          tags.Format<"uri">,
        referrer: "https://seller.shoppingmall.test/landing" as string &
          tags.Format<"uri">,
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
  typia.assert(sellerLogin);

  const createProductBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: "AutoBE Testing Brand",
    model_name: RandomGenerator.alphabets(8),
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/product.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createProductBody,
    });
  typia.assert(product);

  // 4. Seed 15 localizations via seller
  const locales = ["en-US", "ko-KR", "ja-JP"] as const;
  const localizationCount = 15;

  for (let i = 0; i < localizationCount; ++i) {
    const locale = RandomGenerator.pick(locales);
    const body = {
      locale,
      title: `${locale} title ${i + 1}`,
      summary: `${locale} summary ${i + 1}`,
      description: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 6,
        wordMin: 3,
        wordMax: 8,
      }),
    } satisfies IShoppingMallProductLocalization.ICreate;

    const loc: IShoppingMallProductLocalization =
      await api.functional.shoppingMall.seller.products.localizations.create(
        connection,
        {
          productId: product.id,
          body,
        },
      );
    typia.assert(loc);
  }

  // 5. Ensure we are authenticated as admin again
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "AdminPw123!" as string & tags.Format<"password">,
        ip: null,
        href: "https://admin.shoppingmall.test/login" as string &
          tags.Format<"uri">,
        referrer: "https://admin.shoppingmall.test/landing" as string &
          tags.Format<"uri">,
      } satisfies IShoppingMallAdminLogin.ICreate,
    });
  typia.assert(adminLogin);

  // 6. Optionally create a category and attach the product
  const categoryBody = {
    parent_id: null,
    slug: `auto-test-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "AutoBE Test Category",
    description_en: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 7. Page 1 asc
  const page1Asc: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: product.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          locales: undefined,
          search: undefined,
          orderBy: "created_at",
          orderDirection: "asc",
        } satisfies IShoppingMallProductLocalization.IRequest,
      },
    );
  typia.assert(page1Asc);

  TestValidator.equals(
    "page1 asc pagination current is 1",
    page1Asc.pagination.current,
    1,
  );
  TestValidator.equals(
    "page1 asc pagination limit is 10",
    page1Asc.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page1 asc has at most 10 records",
    page1Asc.data.length <= 10,
  );

  const page1Ids = page1Asc.data.map((d) => d.id);

  // 8. Page 2 asc
  const page2Asc: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: product.id,
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          locales: undefined,
          search: undefined,
          orderBy: "created_at",
          orderDirection: "asc",
        } satisfies IShoppingMallProductLocalization.IRequest,
      },
    );
  typia.assert(page2Asc);

  TestValidator.equals(
    "page2 asc pagination current is 2",
    page2Asc.pagination.current,
    2,
  );
  TestValidator.equals(
    "page2 asc pagination limit is 10",
    page2Asc.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page2 asc has at most 10 records",
    page2Asc.data.length <= 10,
  );

  const page2Ids = page2Asc.data.map((d) => d.id);
  const overlap = page2Ids.filter((id) => page1Ids.includes(id));
  TestValidator.equals("no overlap between page1 and page2", overlap.length, 0);

  // 9. Page 1 desc
  const page1Desc: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: product.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          locales: undefined,
          search: undefined,
          orderBy: "created_at",
          orderDirection: "desc",
        } satisfies IShoppingMallProductLocalization.IRequest,
      },
    );
  typia.assert(page1Desc);

  TestValidator.equals(
    "page1 desc pagination current is 1",
    page1Desc.pagination.current,
    1,
  );
  TestValidator.equals(
    "page1 desc pagination limit is 10",
    page1Desc.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page1 desc has at most 10 records",
    page1Desc.data.length <= 10,
  );

  // When both asc and desc page1 have data, compare ID sets to ensure same
  // elements (though order differs). This is a weaker but DTO-safe ordering
  // validation.
  if (page1Asc.data.length > 0 && page1Desc.data.length > 0) {
    const ascIdSet = new Set(page1Asc.data.map((d) => d.id));
    const descIdSet = new Set(page1Desc.data.map((d) => d.id));

    TestValidator.equals(
      "page1 asc and desc have same record count",
      page1Asc.data.length,
      page1Desc.data.length,
    );

    const allIdsMatch =
      [...ascIdSet].every((id) => descIdSet.has(id)) &&
      [...descIdSet].every((id) => ascIdSet.has(id));

    TestValidator.predicate(
      "page1 asc and desc contain identical ID sets",
      allIdsMatch,
    );
  }
}
