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
 * Validate catalog product detail retrieval by a customer.
 *
 * 1. Register a seller.
 * 2. Create a new product under that seller with status 'active', business_status
 *    'approved'.
 * 3. Retrieve product by product code as customer and validate all detail fields.
 * 4. Try getting a non-existent product code (should error).
 * 5. Create an unpublished (draft) product and confirm it's inaccessible to
 *    customers.
 */
export async function test_api_catalog_product_detail_view_by_customer(
  connection: api.IConnection,
) {
  // 1. Register seller
  const email = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email,
      password: "password123!",
      display_name: RandomGenerator.name(2),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Create a public/active product
  const code = RandomGenerator.alphaNumeric(10);
  const createBody = {
    code,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri:
      "https://picsum.photos/seed/" +
      RandomGenerator.alphaNumeric(10) +
      "/500/500",
    status: "active",
    business_status: "approved",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    { body: createBody },
  );
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, code);
  TestValidator.equals(
    "main image uri matches",
    product.main_image_uri,
    createBody.main_image_uri,
  );
  TestValidator.equals("status is active", product.status, "active");
  TestValidator.equals(
    "business_status is approved",
    product.business_status,
    "approved",
  );
  TestValidator.predicate("skus array exists", Array.isArray(product.skus));
  TestValidator.predicate(
    "categories array exists",
    Array.isArray(product.categories),
  );
  TestValidator.predicate("images array exists", Array.isArray(product.images));
  TestValidator.predicate("tags array exists", Array.isArray(product.tags));
  TestValidator.predicate(
    "attributes array exists",
    Array.isArray(product.attributes),
  );

  // 3. Retrieve product detail by code as (unauthenticated) customer
  const customerConn: api.IConnection = { ...connection, headers: {} };
  const detail = await api.functional.shopping.products.at(customerConn, {
    productCode: code,
  });
  typia.assert(detail);
  TestValidator.equals("detail code matches", detail.code, code);
  TestValidator.equals(
    "detail main image uri matches",
    detail.main_image_uri,
    createBody.main_image_uri,
  );
  TestValidator.equals("detail status is active", detail.status, "active");
  TestValidator.equals(
    "detail business_status is approved",
    detail.business_status,
    "approved",
  );
  TestValidator.equals("seller ID matches", detail.seller.id, seller.id);
  TestValidator.predicate("SKUs present", Array.isArray(detail.skus));
  TestValidator.predicate("Images present", Array.isArray(detail.images));
  TestValidator.predicate(
    "Categories present",
    Array.isArray(detail.categories),
  );
  TestValidator.predicate("Tags present", Array.isArray(detail.tags));
  TestValidator.predicate(
    "Attributes present",
    Array.isArray(detail.attributes),
  );

  // 4. Try to fetch non-existent product code (should error)
  await TestValidator.error(
    "fetch non-existent product code should fail",
    async () => {
      await api.functional.shopping.products.at(customerConn, {
        productCode: RandomGenerator.alphaNumeric(15),
      });
    },
  );

  // 5. Create a draft (unpublished) product, assert that it is hidden from customer view
  const draftCode = RandomGenerator.alphaNumeric(12);
  const draftBody = {
    code: draftCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    main_image_uri:
      "https://picsum.photos/seed/" +
      RandomGenerator.alphaNumeric(10) +
      "/500/500",
    status: "draft",
    business_status: "pending",
  } satisfies IShoppingProduct.ICreate;
  const draftProduct = await api.functional.shopping.seller.products.create(
    connection,
    { body: draftBody },
  );
  typia.assert(draftProduct);
  TestValidator.equals("draft product status", draftProduct.status, "draft");

  await TestValidator.error(
    "draft/unpublished product detail hidden to customer",
    async () => {
      await api.functional.shopping.products.at(customerConn, {
        productCode: draftCode,
      });
    },
  );
}
