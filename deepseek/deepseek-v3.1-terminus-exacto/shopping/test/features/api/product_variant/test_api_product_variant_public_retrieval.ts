import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test public retrieval of specific product variant details.
 *
 * This E2E test validates that product variants created through authenticated
 * seller workflows can be publicly accessed by customers without requiring
 * authentication. The test follows a comprehensive multi-actor workflow:
 *
 * 1. Admin authentication and category creation
 * 2. Seller authentication and product creation
 * 3. Product variant creation by the seller
 * 4. Public retrieval of variant details without authentication
 *
 * Key validations include variant-specific information retrieval, pricing
 * overrides, inventory levels, attribute configurations, and active status. The
 * test ensures proper relationship to parent product and validates that all
 * variant details are accessible through public API endpoints.
 */
export async function test_api_product_variant_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication and category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ access: "full" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Seller authentication and product creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "Seller123!";

  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.content({ paragraphs: 1 }),
      tax_id: undefined,
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerAuth);

  // Create parent product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
        compare_price: undefined,
        cost_price: undefined,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
        >(),
        status: "active",
        condition: "new",
        weight: undefined,
        dimensions: undefined,
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id:
            category.parent?.id ?? typia.random<string & tags.Format<"uuid">>(),
          created_at: category.created_at,
          updated_at: category.updated_at,
          parent: undefined,
        } satisfies IShoppingMallCategory.ISummary,
        seller: {
          id: sellerAuth.id,
          business_name: sellerAuth.business_name,
          contact_person: sellerAuth.contact_person,
          email: sellerAuth.email,
          status: sellerAuth.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Product variant creation
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku: `${product.sku}-V1`,
          price: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<500>
          >(),
          attributes: JSON.stringify({
            size: RandomGenerator.pick(["Small", "Medium", "Large"] as const),
            color: RandomGenerator.pick([
              "Red",
              "Blue",
              "Green",
              "Black",
            ] as const),
            material: RandomGenerator.pick([
              "Cotton",
              "Polyester",
              "Wool",
            ] as const),
          }),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // Step 4: Public retrieval without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const retrievedVariant =
    await api.functional.shoppingMall.products.variants.at(unauthConn, {
      productId: product.id,
      variantId: variant.id,
    });
  typia.assert(retrievedVariant);

  // Validate retrieved variant matches created variant
  TestValidator.equals("variant ID matches", retrievedVariant.id, variant.id);
  TestValidator.equals(
    "variant name matches",
    retrievedVariant.variant_name,
    variant.variant_name,
  );
  TestValidator.equals("SKU matches", retrievedVariant.sku, variant.sku);
  TestValidator.equals("price matches", retrievedVariant.price, variant.price);
  TestValidator.equals(
    "stock quantity matches",
    retrievedVariant.stock_quantity,
    variant.stock_quantity,
  );
  TestValidator.equals(
    "attributes match",
    retrievedVariant.attributes,
    variant.attributes,
  );
  TestValidator.equals(
    "active status matches",
    retrievedVariant.active,
    variant.active,
  );
  TestValidator.equals(
    "parent product ID matches",
    retrievedVariant.product?.id,
    product.id,
  );
  TestValidator.equals(
    "parent product name matches",
    retrievedVariant.product?.name,
    product.name,
  );
  TestValidator.predicate("variant is active", retrievedVariant.active);
  TestValidator.predicate(
    "variant has valid stock quantity",
    retrievedVariant.stock_quantity > 0,
  );
}
