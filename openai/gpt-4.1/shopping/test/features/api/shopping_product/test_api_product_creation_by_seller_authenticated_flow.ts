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
 * E2E test for the complete product creation workflow by an authenticated
 * seller.
 *
 * This test verifies the following business and API requirements:
 *
 * - Seller registration and immediate authentication with unique credentials
 *   (email, password, display name, contact phone).
 * - Authentication JWT is received and required for product creation API calls.
 * - Seller submits a valid product creation request with all required fields
 *   (code, name, description, main_image_uri, status, business_status).
 * - Product is created in the catalog linked to the seller's account, with a
 *   unique product code and id.
 * - Product status is either 'draft' or 'under_review' by default, business logic
 *   does not allow immediate publication/public state for a product without
 *   required SKUs.
 * - The created product is associated to the seller in catalog and accessible for
 *   subsequent catalog management.
 * - Only authenticated sellers may create products; unauthenticated creation
 *   attempt should fail (not part of this scenario).
 *
 * The test does NOT cover edge cases such as duplicate emails, invalid required
 * fields, or invalid status values.
 *
 * Steps:
 *
 * 1. Register and authenticate a new seller (unique email).
 * 2. Prepare valid product creation DTO with all mandatory fields.
 * 3. Call the product creation API with authenticated context (via JWT).
 * 4. Validate returned product is correctly registered, linked to seller, and has
 *    a unique code and id.
 * 5. Check that product status is either 'draft' or 'under_review'.
 * 6. Confirm that the product catalog and registration logic enforce business
 *    rules, including workflow state and mandatory schema fields.
 */
export async function test_api_product_creation_by_seller_authenticated_flow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(authorizedSeller);

  // 2. Prepare valid product creation DTO with all mandatory fields
  const code = RandomGenerator.alphaNumeric(10);
  const mainImageUri =
    "https://picsum.photos/600/400?random=" + RandomGenerator.alphaNumeric(5);
  // Choose status and business_status as 'draft' and 'in_review' to match onboarding constraints
  const productCreateBody = {
    code,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri: mainImageUri,
    status: "draft",
    business_status: "in_review",
    // optional shipping fields omitted for initial catalog creation
  } satisfies IShoppingProduct.ICreate;

  // 3. Call the product creation API with authenticated context (via JWT in connection)
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: productCreateBody,
    },
  );
  typia.assert(product);

  // 4. Validate returned product is correctly registered, linked to seller, and has unique code/id
  TestValidator.equals("product code should match input", product.code, code);
  TestValidator.equals(
    "product seller should match authenticated seller",
    product.shopping_seller_id,
    authorizedSeller.id,
  );
  TestValidator.equals(
    "seller summary should match authorized seller",
    product.seller.id,
    authorizedSeller.id,
  );
  TestValidator.equals(
    "seller display name should match",
    product.seller.display_name,
    authorizedSeller.display_name,
  );
  TestValidator.predicate(
    "product id should be non-empty UUID",
    typeof product.id === "string" && product.id.length > 0,
  );
  TestValidator.equals(
    "product main image URI matches input",
    product.main_image_uri,
    mainImageUri,
  );

  // 5. Check that product status is either 'draft' or 'under_review' (cannot be 'active' at creation since SKUs missing)
  TestValidator.predicate(
    "product status is draft or under_review",
    product.status === "draft" || product.status === "under_review",
  );
  TestValidator.equals(
    "business_status mirrors request",
    product.business_status,
    "in_review",
  );

  // 6. Product must have zero SKUs at creation
  TestValidator.equals(
    "product SKUs array is empty initially",
    product.skus.length,
    0,
  );

  // 7. Optional fields are correctly defaulted/omitted
  TestValidator.predicate(
    "deleted_at is null or undefined for new product",
    product.deleted_at === null || product.deleted_at === undefined,
  );
}
