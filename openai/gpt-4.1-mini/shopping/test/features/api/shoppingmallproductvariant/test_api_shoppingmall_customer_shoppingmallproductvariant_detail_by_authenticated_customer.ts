import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shoppingmall_customer_shoppingmallproductvariant_detail_by_authenticated_customer(
  connection: api.IConnection,
) {
  // 1. Customer join (register new customer account)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer-password-1234";
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerAuthorized);

  // 2. Seller join (register new seller account)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller-password-1234";
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerAuthorized);

  // 3. Seller create a new product
  // Generate realistic product code (alphanumeric 8 chars)
  const productCode = RandomGenerator.alphaNumeric(8);
  const productTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const productDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const productCategoryCode = "CATEGORY123"; // Since category_code is required but category creation not in scope, use plausible code

  const productCreated: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: {
          code: productCode,
          title: productTitle,
          description: productDescription,
          brand: "TestBrand",
          category_code: productCategoryCode,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(productCreated);

  // 4. Customer login to authenticate for subsequent access
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "https://example.com/login",
        referrer: "https://example.com/landing",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(customerLoggedIn);

  // 5. Retrieve product variant detail by customer
  // For test, generate a SKU code matching the test product variant
  // Since we don't have an API to create product variants, we simulate a plausible SKU code
  const skuCode = RandomGenerator.alphaNumeric(10);

  const variantDetail: IShoppingMallProductVariant =
    await api.functional.shoppingMall.customer.shoppingMallProducts.shoppingMallProductVariants.at(
      connection,
      {
        productCode: productCode,
        skuCode: skuCode,
      },
    );
  typia.assert(variantDetail);

  // Validate that the returned variant belongs to the created product
  TestValidator.equals(
    "variant's shopping_mall_product_id equals product id",
    variantDetail.shopping_mall_product_id,
    productCreated.id,
  );

  // Validate that variant SKU code matches requested SKU code
  TestValidator.equals(
    "variant's sku_code matches requested skuCode",
    variantDetail.sku_code,
    skuCode,
  );

  // Additional checks to ensure required fields are not null
  TestValidator.predicate(
    "variant price is a non-negative number",
    typeof variantDetail.price === "number" && variantDetail.price >= 0,
  );
  TestValidator.predicate(
    "variant status is a non-empty string",
    typeof variantDetail.status === "string" && variantDetail.status.length > 0,
  );
  TestValidator.predicate(
    "variant created_at is ISO date-time string",
    typeof variantDetail.created_at === "string" &&
      !isNaN(Date.parse(variantDetail.created_at)),
  );
  TestValidator.predicate(
    "variant updated_at is ISO date-time string",
    typeof variantDetail.updated_at === "string" &&
      !isNaN(Date.parse(variantDetail.updated_at)),
  );
  // deleted_at can be null or a string
  TestValidator.predicate(
    "variant deleted_at is null or ISO date-time string",
    variantDetail.deleted_at === null ||
      (typeof variantDetail.deleted_at === "string" &&
        !isNaN(Date.parse(variantDetail.deleted_at))),
  );
}
