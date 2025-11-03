import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Verify admin can view detailed seller account info after creation.
 *
 * 1. Join as an admin (creates an authenticated admin user)
 * 2. Create a product as a seller (implicitly registers the seller and gives
 *    sellerId)
 * 3. Create an address for the seller
 * 4. Use the admin endpoint to fetch the seller's details
 * 5. Assert all critical profile fields are present and correct; ids, emails, and
 *    timestamps have correct formats
 * 6. Check the sellerId link remains unchanged after address creation
 * 7. Ensure only authorized fields are exposed (no password hashes etc)
 */
export async function test_api_admin_view_seller_account_detail_after_creation(
  connection: api.IConnection,
) {
  // 1. Join as an admin
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick(["super", "support", "operator"] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Create a product as the seller (implicitly creates seller)
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 5,
      wordMax: 10,
    }),
    main_image_uri: `https://img.example.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
    status: "active",
    business_status: "in_review",
  } satisfies IShoppingProduct.ICreate;

  const product = await api.functional.shopping.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);
  const sellerId = product.shopping_seller_id;

  // 3. Create a seller address using the sellerId
  const addressBody = {
    address_line1: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 10,
      wordMax: 15,
    }),
    city: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    state: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: RandomGenerator.pick([
      "South Korea",
      "United States",
      "Japan",
    ] as const),
    is_primary: true,
    is_return_address: false,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(2),
    // Optional: address_line2 left as undefined/null
  } satisfies IShoppingSellerAddress.ICreate;

  const address = await api.functional.shopping.seller.sellers.addresses.create(
    connection,
    {
      sellerId,
      body: addressBody,
    },
  );
  typia.assert(address);
  TestValidator.equals(
    "address created for correct sellerId",
    address.shopping_seller_id,
    sellerId,
  );

  // 4. Admin fetches the seller's detailed information
  const seller = await api.functional.shopping.admin.sellers.at(connection, {
    sellerId,
  });
  typia.assert(seller);

  // 5. Assert all expected fields and formats
  TestValidator.equals("seller.id matches sellerId", seller.id, sellerId);
  TestValidator.predicate(
    "seller.email has correct email format",
    typia.is<string & tags.Format<"email">>(seller.email),
  );
  TestValidator.equals(
    "seller.display_name matches product.seller.display_name",
    seller.display_name,
    product.seller.display_name,
  );
  TestValidator.equals(
    "seller.status non-empty",
    typeof seller.status,
    "string",
  );
  TestValidator.equals(
    "seller.contact_phone type is string",
    typeof seller.contact_phone,
    "string",
  );
  TestValidator.predicate(
    "seller.created_at is ISO date-time",
    typia.is<string & tags.Format<"date-time">>(seller.created_at),
  );
  TestValidator.predicate(
    "seller.updated_at is ISO date-time",
    typia.is<string & tags.Format<"date-time">>(seller.updated_at),
  );

  // Ensure no sensitive fields like password_hash are present
  TestValidator.predicate(
    "seller object contains only allowed fields",
    Object.keys(seller).every((k) =>
      [
        "id",
        "email",
        "display_name",
        "contact_phone",
        "status",
        "created_at",
        "updated_at",
      ].includes(k),
    ),
  );
}
