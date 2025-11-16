import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_seller_product_creation_basic(
  connection: api.IConnection,
) {
  // 1. Register a new seller (join) to obtain authenticated seller context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // 2. Create a basic single-SKU product without brand association
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    12,
  ) as string as string & tags.MinLength<1>;
  const productName: string & tags.MinLength<1> = RandomGenerator.paragraph({
    sentences: 2,
  }) as string as string & tags.MinLength<1>;

  const primaryImageUri = typia.random<string & tags.Format<"uri">>();

  const createBody = {
    shopping_mall_seller_id: authorizedSeller.id,
    // omit shopping_mall_brand_id to represent unbranded product
    code: productCode,
    name: productName,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: primaryImageUri,
    additional_data: JSON.stringify({ source: "e2e-test", kind: "basic" }),
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallProduct>(createdProduct);

  // 3. Field-level business validations
  // Type-level validation is already guaranteed by typia.assert

  // Validate that scalar fields reflect the request body
  TestValidator.equals(
    "product code should match input code",
    createdProduct.code,
    createBody.code,
  );
  TestValidator.equals(
    "product name should match input name",
    createdProduct.name,
    createBody.name,
  );
  TestValidator.equals(
    "product status should match input status",
    createdProduct.status,
    createBody.status,
  );
  TestValidator.equals(
    "product is_multi_sku should be false for basic single-SKU",
    createdProduct.is_multi_sku,
    createBody.is_multi_sku,
  );
  TestValidator.equals(
    "product primary_image_uri should match input",
    createdProduct.primary_image_uri,
    createBody.primary_image_uri,
  );
  TestValidator.equals(
    "product additional_data should match input",
    createdProduct.additional_data,
    createBody.additional_data,
  );

  // Validate seller summary in product matches authenticated seller summary
  TestValidator.equals(
    "product seller.id should match authorized seller summary id",
    createdProduct.seller.id,
    authorizedSeller.seller.id,
  );
  TestValidator.equals(
    "product seller.email should match authorized seller summary email",
    createdProduct.seller.email,
    authorizedSeller.seller.email,
  );
  TestValidator.equals(
    "product seller.store_name should match authorized seller summary store_name",
    createdProduct.seller.store_name,
    authorizedSeller.seller.store_name,
  );
  TestValidator.equals(
    "product seller.status should match authorized seller summary status",
    createdProduct.seller.status,
    authorizedSeller.seller.status,
  );

  // Validate that brand association is null/undefined when not provided
  TestValidator.equals(
    "product brand should be null or undefined when no brand id supplied",
    createdProduct.brand ?? null,
    null,
  );

  // 4. Business rule: seller cannot create product under a different seller id
  const otherSellerId = typia.random<string & tags.Format<"uuid">>();
  const mismatchedCreateBody = {
    ...createBody,
    shopping_mall_seller_id: otherSellerId,
  } satisfies IShoppingMallProduct.ICreate;

  await TestValidator.error(
    "seller cannot create product for another seller",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: mismatchedCreateBody,
      });
    },
  );
}
