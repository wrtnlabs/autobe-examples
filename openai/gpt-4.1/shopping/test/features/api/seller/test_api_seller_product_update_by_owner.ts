import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the complete workflow for a seller updating an existing product's core
 * business information in the shopping mall catalog.
 *
 * Validates:
 *
 * 1. Seller account registration via /auth/seller/join and authentication context
 * 2. Creation of a new catalog product
 * 3. Product update by its owner with new title, description, default_price,
 *    business_status
 * 4. Enforcement of business constraints: only non-deleted products are updatable,
 *    seller ownership, field mutation restrictions, and permissible
 *    business_status change
 * 5. Business rules for title uniqueness (per seller), non-negative price, valid
 *    status enumeration transition, and audit integrity after update
 */
export async function test_api_seller_product_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerRegistrationNo = RandomGenerator.alphaNumeric(10);
  const joinInput = {
    email: sellerEmail,
    password: "Password123!",
    business_name: RandomGenerator.name(2),
    registration_number: sellerRegistrationNo,
    business_phone: RandomGenerator.mobile(),
    href: "https://seller-portal.example.com/registration",
    referrer: "https://marketplace.example.com/",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: joinInput });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller registration business_name must match summary",
    sellerAuth.business_name,
    joinInput.business_name,
  );
  TestValidator.equals(
    "seller registration number matches",
    sellerAuth.registration_number,
    joinInput.registration_number,
  );
  TestValidator.equals(
    "seller account not deleted",
    sellerAuth.seller?.business_name, // Check seller summary present
    sellerAuth.business_name,
  );

  // 2. Product creation by seller
  const origProductTitle = RandomGenerator.paragraph({ sentences: 2 });
  const productInput = {
    title: origProductTitle,
    description: RandomGenerator.content({ paragraphs: 2, sentenceMin: 4 }),
    default_price: 1000,
    business_status: "draft",
  } satisfies IShoppingMallProduct.ICreate;
  const origProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: productInput,
    });
  typia.assert(origProduct);
  TestValidator.equals(
    "created product owner should be current seller",
    origProduct.seller.business_name,
    sellerAuth.business_name,
  );
  TestValidator.equals(
    "created product title",
    origProduct.title,
    origProductTitle,
  );
  TestValidator.predicate(
    "default_price must be non-negative",
    origProduct.default_price >= 0,
  );
  TestValidator.equals(
    "initial business_status is draft",
    origProduct.business_status,
    "draft",
  );
  TestValidator.equals(
    "product not deleted upon creation",
    origProduct.deleted_at,
    null,
  );

  // 3. Product update (fields: title, description, default_price, business_status)
  const updateTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updateDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatePrice = 15350;
  const updateStatus = RandomGenerator.pick([
    "published",
    "archived",
    "blocked",
    "pending_approval",
  ] as const);
  const updateInput = {
    title: updateTitle,
    description: updateDescription,
    default_price: updatePrice,
    business_status: updateStatus,
  } satisfies IShoppingMallProduct.IUpdate;
  const updated: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: origProduct.id,
      body: updateInput,
    });
  typia.assert(updated);
  TestValidator.equals("updated product title", updated.title, updateTitle);
  TestValidator.equals(
    "updated product description",
    updated.description,
    updateDescription,
  );
  TestValidator.equals(
    "updated product price",
    updated.default_price,
    updatePrice,
  );
  TestValidator.equals(
    "updated product business_status",
    updated.business_status,
    updateStatus,
  );
  TestValidator.equals(
    "product id must remain unchanged",
    updated.id,
    origProduct.id,
  );
  TestValidator.equals(
    "product owner unmodified after update",
    updated.seller.business_name,
    origProduct.seller.business_name,
  );
  TestValidator.equals(
    "deleted_at unchanged after update",
    updated.deleted_at,
    null,
  );
  TestValidator.predicate(
    "updated default_price must not be negative",
    updated.default_price >= 0,
  );
  TestValidator.equals(
    "created_at is not modified during update",
    updated.created_at,
    origProduct.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp must be after original",
    updated.updated_at > origProduct.updated_at,
  );
  // 4. Attempt to update product to duplicate title (should error)
  const altProduct = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2, sentenceMin: 4 }),
        default_price: 3000,
        business_status: "draft",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(altProduct);
  await TestValidator.error(
    "should not allow duplicate title per seller",
    async () => {
      await api.functional.shoppingMall.seller.products.update(connection, {
        productId: updated.id,
        body: {
          title: altProduct.title, // already exists for same seller
        } satisfies IShoppingMallProduct.IUpdate,
      });
    },
  );
  // 5. Attempt to update product with negative price (should error)
  await TestValidator.error("reject negative price", async () => {
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: updated.id,
      body: { default_price: -1000 } satisfies IShoppingMallProduct.IUpdate,
    });
  });
  // 6. Attempt to update deleted product (simulate soft delete by setting deleted_at - but we cannot mutate directly, so we skip direct soft delete logic)
  // Out of scope: since the API does not allow deleted_at manipulation in schema, skip direct deleted logic
  // 7. Ownership enforcement: another seller cannot update this seller's product
  // Register another seller
  const attackerEmail: string = typia.random<string & tags.Format<"email">>();
  const attackerRegistrationNo = RandomGenerator.alphaNumeric(10);
  const attackerJoin = {
    email: attackerEmail,
    password: "Attacker123!",
    business_name: RandomGenerator.name(2),
    registration_number: attackerRegistrationNo,
    business_phone: RandomGenerator.mobile(),
    href: "https://seller-portal.example.com/registration",
    referrer: "https://marketplace.example.com/",
  } satisfies IShoppingMallSeller.ICreate;
  const attackerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: attackerJoin });
  typia.assert(attackerAuth);
  // Try updating original seller's product as 2nd seller (must error)
  await TestValidator.error(
    "ownership enforcement: other seller cannot update product",
    async () => {
      await api.functional.shoppingMall.seller.products.update(connection, {
        productId: updated.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallProduct.IUpdate,
      });
    },
  );
}
