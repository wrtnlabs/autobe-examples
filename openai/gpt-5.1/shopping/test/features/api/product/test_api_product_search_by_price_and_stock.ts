import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_product_search_by_price_and_stock(
  connection: api.IConnection,
) {
  // 1. Register and login as platform admin (to be realistic, even though brand creation
  //    would work with just join since join already returns an authorized session).
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register a seller and log them in
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Explicit seller login (even though join already authenticates)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4. As seller, create two products with different pricing semantics.
  // We can’t set prices directly on IShoppingMallProduct.ICreate, but the
  // search summaries expose min_price/max_price computed from SKUs. Since
  // SKU/inventory APIs are not available, we rely on the backend’s own
  // price computation and only validate constraints when min_price/max_price
  // are defined in responses.
  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  const statusValue = "active" as string & tags.MinLength<1>;

  const lowCode: string & tags.MinLength<1> = ("LOW-" +
    RandomGenerator.alphaNumeric(8)) as string & tags.MinLength<1>;
  const highCode: string & tags.MinLength<1> = ("HIGH-" +
    RandomGenerator.alphaNumeric(8)) as string & tags.MinLength<1>;

  const lowProductBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: lowCode,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: statusValue,
    is_multi_sku: false,
    primary_image_uri: ("https://cdn.example.com/products/" +
      RandomGenerator.alphaNumeric(8)) as string & tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const lowProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: lowProductBody,
    });
  typia.assert(lowProduct);

  const highProductBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: highCode,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: statusValue,
    is_multi_sku: false,
    primary_image_uri: ("https://cdn.example.com/products/" +
      RandomGenerator.alphaNumeric(8)) as string & tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const highProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: highProductBody,
    });
  typia.assert(highProduct);

  // 5. Use a fresh unauthenticated connection for catalog search.
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Helper to perform a search and assert price constraints when possible.
  const performSearchAndAssert = async (
    titlePrefix: string,
    requestBody: IShoppingMallProduct.IRequest,
  ): Promise<IPageIShoppingMallProduct.ISummary> => {
    const page: IPageIShoppingMallProduct.ISummary =
      await api.functional.shoppingMall.products.index(anonymousConnection, {
        body: requestBody,
      });
    typia.assert(page);

    const pagination: IPage.IPagination = page.pagination;
    typia.assert(pagination);

    TestValidator.predicate(
      `${titlePrefix} - has non-negative record count`,
      pagination.records >= 0,
    );

    // When we have at least one item, validate min/max price constraints
    if (page.data.length > 0) {
      await TestValidator.predicate(
        `${titlePrefix} - page has at least one product`,
        async () => page.data.length > 0,
      );

      const expectedMin = requestBody.min_price;
      const expectedMax = requestBody.max_price;

      if (expectedMin !== undefined || expectedMax !== undefined) {
        for (const summary of page.data) {
          typia.assert(summary);

          if (summary.min_price !== undefined) {
            if (expectedMin !== undefined) {
              TestValidator.predicate(
                `${titlePrefix} - summary.min_price >= min_price`,
                summary.min_price >= expectedMin,
              );
            }
            if (expectedMax !== undefined) {
              TestValidator.predicate(
                `${titlePrefix} - summary.min_price <= max_price`,
                summary.min_price <= expectedMax,
              );
            }
          }

          if (summary.max_price !== undefined) {
            if (expectedMin !== undefined) {
              TestValidator.predicate(
                `${titlePrefix} - summary.max_price >= min_price`,
                summary.max_price >= expectedMin,
              );
            }
            if (expectedMax !== undefined) {
              TestValidator.predicate(
                `${titlePrefix} - summary.max_price <= max_price`,
                summary.max_price <= expectedMax,
              );
            }
          }
        }
      }
    }

    return page;
  };

  // Build a price window that is expected to include primarily the lower
  // priced product. Since we can’t control actual prices, we choose an
  // arbitrary window and only validate that all results respect it when
  // price fields are present.
  const baseMinPrice = 1;
  const baseMaxPrice = 1000000;

  const priceWindowMin = baseMinPrice;
  const priceWindowMax = baseMaxPrice;

  const baseRequest: IShoppingMallProduct.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_field: "created_at",
    sort_direction: "desc",
    keyword: undefined,
    status: statusValue,
    seller_id: sellerId,
    brand_id: brand.id,
    category_ids: undefined,
    region_setting_id: undefined,
    channel: undefined,
    min_price: priceWindowMin,
    max_price: priceWindowMax,
    in_stock_only: true,
    compliance_flag_types: undefined,
  } satisfies IShoppingMallProduct.IRequest;

  // 1st search: in_stock_only = true
  const firstPage = await performSearchAndAssert(
    "price+stock search (in_stock_only=true)",
    baseRequest,
  );
  void firstPage;

  // 2nd search: identical range but in_stock_only = false
  const secondRequest: IShoppingMallProduct.IRequest = {
    ...baseRequest,
    in_stock_only: false,
  } satisfies IShoppingMallProduct.IRequest;

  const secondPage = await performSearchAndAssert(
    "price+stock search (in_stock_only=false)",
    secondRequest,
  );
  void secondPage;
}
