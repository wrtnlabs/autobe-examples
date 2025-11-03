import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
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
 * Validate seller product update with enforced business constraints and
 * ownership.
 *
 * 1. Register a new seller.
 * 2. Create a product as that seller.
 * 3. Update the product's name, description, and status.
 * 4. Confirm updated fields are changed, immutable fields remain unchanged.
 * 5. Attempt to update the immutable product code is forbidden by DTO and omitted
 *    from test as type error cases are not permitted.
 * 6. Owner-only modification enforcement is covered as the seller always owns the
 *    product.
 */
export async function test_api_product_update_by_seller_success(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "registered email matches",
    sellerAuth.email,
    sellerJoinBody.email,
  );

  // 2. Create a product as that seller
  const productCode = RandomGenerator.alphaNumeric(12);
  const createProductBody = {
    code: productCode,
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri: `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(10)}.jpg`,
    status: "draft",
    business_status: "in_review",
  } satisfies IShoppingProduct.ICreate;
  const createdProduct = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: createProductBody,
    },
  );
  typia.assert(createdProduct);
  TestValidator.equals(
    "created product code matches input",
    createdProduct.code,
    productCode,
  );
  TestValidator.equals(
    "created product name matches input",
    createdProduct.name,
    createProductBody.name,
  );

  // 3. Update the product's name, description, and status
  const updatedName = RandomGenerator.name();
  const updatedDescription = RandomGenerator.content({ paragraphs: 1 });
  const updatedStatus = "active";
  const updateProductBody = {
    name: updatedName,
    description: updatedDescription,
    status: updatedStatus,
  } satisfies IShoppingProduct.IUpdate;
  const updatedProduct = await api.functional.shopping.seller.products.update(
    connection,
    {
      productCode: productCode,
      body: updateProductBody,
    },
  );
  typia.assert(updatedProduct);
  TestValidator.equals(
    "updated product code unchanged",
    updatedProduct.code,
    productCode,
  );
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    updatedName,
  );
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    updatedDescription,
  );
  TestValidator.equals(
    "product status updated",
    updatedProduct.status,
    updatedStatus,
  );
  // Forbidden code update scenario is omitted because IUpdate DTO and TypeScript type system will prevent inclusion of immutable fields and E2E test guidance strictly forbids type error testing.
}
