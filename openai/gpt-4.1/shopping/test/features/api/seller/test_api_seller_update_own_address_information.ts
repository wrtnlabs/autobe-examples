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
import type { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Test that a seller can update their own address details, and that
 * unauthorized sellers cannot update others' addresses. The test also verifies
 * mutual exclusivity of is_primary/is_return_address and updates audit fields.
 */
export async function test_api_seller_update_own_address_information(
  connection: api.IConnection,
) {
  // 1. Register seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPayload = {
    email: sellerAEmail,
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: sellerAPayload,
  });
  typia.assert(sellerA);

  // 2. Create a product to ensure seller is fully registered/created
  const productPayload = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 1 }),
    main_image_uri: "https://example.com/image.jpg",
    status: "draft",
    business_status: "in_review",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    { body: productPayload },
  );
  typia.assert(product);

  // 3. Register seller A's address
  const addressCreatePayload = {
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    is_primary: true,
    is_return_address: false,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(2),
  } satisfies IShoppingSellerAddress.ICreate;
  const address = await api.functional.shopping.seller.sellers.addresses.create(
    connection,
    {
      sellerId: sellerA.id,
      body: addressCreatePayload,
    },
  );
  typia.assert(address);
  TestValidator.equals(
    "seller id matches",
    address.shopping_seller_id,
    sellerA.id,
  );
  TestValidator.equals(
    "should set is_primary to true",
    address.is_primary,
    true,
  );
  TestValidator.equals(
    "should set is_return_address to false",
    address.is_return_address,
    false,
  );

  // Store created_at for later audit comparison
  const oldUpdatedAt = address.updated_at;

  // 4. Update address: modify fields and toggle is_primary/is_return_address
  const updatePayloadPrimaryToReturn = {
    address_line1: RandomGenerator.paragraph({ sentences: 3 }),
    address_line2: null,
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    country: "South Korea",
    postal_code: RandomGenerator.alphaNumeric(6),
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(2),
    is_primary: false,
    is_return_address: true,
  } satisfies IShoppingSellerAddress.IUpdate;
  const updated = await api.functional.shopping.seller.sellers.addresses.update(
    connection,
    {
      sellerId: sellerA.id,
      addressId: address.id,
      body: updatePayloadPrimaryToReturn,
    },
  );
  typia.assert(updated);
  TestValidator.equals("address id should not change", updated.id, address.id);
  TestValidator.equals(
    "owner should remain the same",
    updated.shopping_seller_id,
    sellerA.id,
  );
  TestValidator.equals(
    "is_primary properly toggled to false",
    updated.is_primary,
    false,
  );
  TestValidator.equals(
    "is_return_address toggled to true",
    updated.is_return_address,
    true,
  );
  TestValidator.notEquals(
    "updated_at must change after update",
    updated.updated_at,
    oldUpdatedAt,
  );
  TestValidator.equals(
    "address_line1 updated properly",
    updated.address_line1,
    updatePayloadPrimaryToReturn.address_line1,
  );
  TestValidator.equals(
    "address_line2 updated (set to null)",
    updated.address_line2,
    null,
  );
  TestValidator.equals(
    "recipient_name updated",
    updated.recipient_name,
    updatePayloadPrimaryToReturn.recipient_name,
  );

  // 5. Register seller B (unauthorized)
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPayload = {
    email: sellerBEmail,
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: sellerBPayload,
  });
  typia.assert(sellerB);

  // 6. Seller B attempts to update Seller A's address (should fail)
  await TestValidator.error(
    "seller B cannot update A's address (authz error)",
    async () => {
      await api.functional.shopping.seller.sellers.addresses.update(
        connection,
        {
          sellerId: sellerB.id,
          addressId: address.id,
          body: {
            city: RandomGenerator.name(1),
          },
        },
      );
    },
  );
}
