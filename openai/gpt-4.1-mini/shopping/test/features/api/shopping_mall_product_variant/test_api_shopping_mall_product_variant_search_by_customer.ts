import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_product_variant_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Create a new customer account via auth.customer.join
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "P@ssw0rd1234";
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "https://example.com/signup",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerAuthorized);

  // 2. Create a new seller account via auth.seller.join and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "P@ssw0rd1234";
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerAuthorized);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://example.com/seller/login",
      referrer: "https://example.com/seller/home",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Seller creates a product
  // We use a realistic category_code string
  const categoryCode = `cat-${RandomGenerator.alphaNumeric(5)}`;
  const productCode = `prd-${RandomGenerator.alphaNumeric(8)}`;
  const productTitle = `${RandomGenerator.name(3)} Product`;
  const productDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const productBrand = RandomGenerator.name(1);

  const productCreateBody = {
    code: productCode,
    title: productTitle,
    description: productDescription,
    brand: productBrand,
    category_code: categoryCode,
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(createdProduct);

  // 4. Customer login to authenticate for variant search
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 5. Customer searches product variants by patch /shoppingMall/customer/shoppingMallProducts/{productCode}/shoppingMallProductVariants
  const pageNumber = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const limitCount = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const variantSearchRequest = {
    color: null,
    size: null,
    option: null,
    min_price: 0,
    max_price: 1000000,
    status: null,
    page: pageNumber,
    limit: limitCount,
    sort_by: "price",
    order: "asc",
  } satisfies IShoppingMallProductVariant.IRequest;

  const variantsPage: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallProducts.shoppingMallProductVariants.index(
      connection,
      {
        productCode: createdProduct.code,
        body: variantSearchRequest,
      },
    );
  typia.assert(variantsPage);

  // 6. Validate pagination properties
  TestValidator.predicate(
    "pagination current page equals request page",
    variantsPage.pagination.current === pageNumber,
  );
  TestValidator.predicate(
    "pagination limit equals request limit",
    variantsPage.pagination.limit === limitCount,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    variantsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    variantsPage.pagination.pages >= 0,
  );

  // 7. Validate that each variant returned has valid id, sku_code, and price
  for (const variant of variantsPage.data) {
    TestValidator.predicate(
      "variant id is uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        variant.id,
      ),
    );
    TestValidator.predicate(
      "variant sku_code non-empty string",
      typeof variant.sku_code === "string" && variant.sku_code.length > 0,
    );
    TestValidator.predicate(
      "variant price is non-negative number",
      typeof variant.price === "number" && variant.price >= 0,
    );
  }
}
