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
 * Test comprehensive variant update workflow including price adjustments,
 * inventory changes, and attribute modifications. Seller creates full product
 * hierarchy (category → product → variant), then updates variant details while
 * ensuring SKU uniqueness is maintained and ownership validation prevents
 * unauthorized modifications.
 */
export async function test_api_product_variant_update_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({ can_create_categories: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category as administrator
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPassword123!",
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.content({ paragraphs: 1 }),
        tax_id: undefined,
        ip: undefined,
        href: "https://shoppingmall.example.com/seller/register",
        referrer: "https://shoppingmall.example.com/",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Seller creates a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<number & tags.Minimum<0> & tags.Maximum<10000>>(),
        compare_price: undefined,
        cost_price: undefined,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
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
          id: seller.id,
          business_name: seller.business_name,
          contact_person: seller.contact_person,
          email: seller.email,
          status: seller.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 5: Seller creates initial variant
  const initialVariant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku: RandomGenerator.alphaNumeric(8),
          price: typia.random<number & tags.Minimum<0> & tags.Maximum<5000>>(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<500>
          >(),
          attributes: JSON.stringify({
            color: RandomGenerator.pick([
              "red",
              "blue",
              "green",
              "black",
              "white",
            ] as const),
            size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
          }),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(initialVariant);

  // Step 6: Seller updates variant details
  const updateData = {
    variant_name: RandomGenerator.paragraph({ sentences: 2 }),
    sku: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Minimum<0> & tags.Maximum<5000>>(),
    stock_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<500>
    >(),
    attributes: JSON.stringify({
      color: RandomGenerator.pick([
        "red",
        "blue",
        "green",
        "black",
        "white",
      ] as const),
      size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
      material: RandomGenerator.pick(["cotton", "polyester", "wool"] as const),
    }),
    active: true,
  } satisfies IShoppingMallProductVariant.IUpdate;

  const updatedVariant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: updateData,
      },
    );
  typia.assert(updatedVariant);

  // Step 7: Validate that updates were properly applied
  TestValidator.equals(
    "variant ID remains unchanged",
    updatedVariant.id,
    initialVariant.id,
  );
  TestValidator.equals(
    "variant name updated",
    updatedVariant.variant_name,
    updateData.variant_name,
  );
  TestValidator.equals("SKU updated", updatedVariant.sku, updateData.sku);
  TestValidator.equals("price updated", updatedVariant.price, updateData.price);
  TestValidator.equals(
    "stock quantity updated",
    updatedVariant.stock_quantity,
    updateData.stock_quantity,
  );
  TestValidator.equals(
    "attributes updated",
    updatedVariant.attributes,
    updateData.attributes,
  );
  TestValidator.equals(
    "active status remains true",
    updatedVariant.active,
    true,
  );

  // Step 8: Test SKU uniqueness constraint
  await TestValidator.error("duplicate SKU should fail", async () => {
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku: updatedVariant.sku, // Duplicate SKU
          price: typia.random<number & tags.Minimum<0> & tags.Maximum<5000>>(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<500>
          >(),
          attributes: JSON.stringify({
            color: "yellow",
            size: "XXL",
          }),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  });

  // Step 9: Test ownership validation by creating another seller
  const otherSellerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const otherSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: otherSellerEmail,
        password: "OtherSeller123!",
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.content({ paragraphs: 1 }),
        tax_id: undefined,
        ip: undefined,
        href: "https://shoppingmall.example.com/seller/register",
        referrer: "https://shoppingmall.example.com/",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(otherSeller);

  // Switch to other seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: otherSellerEmail,
      password: "OtherSeller123!",
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/seller/login",
      device: undefined,
      ip: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 10: Verify other seller cannot update the variant
  await TestValidator.error("other seller cannot update variant", async () => {
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          variant_name: "Unauthorized Update",
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  });

  // Step 11: Switch back to original seller and verify can still update
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPassword123!",
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/seller/login",
      device: undefined,
      ip: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });

  const finalUpdate: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          variant_name: "Final Authorized Update",
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(finalUpdate);
  TestValidator.equals(
    "authorized seller can update",
    finalUpdate.variant_name,
    "Final Authorized Update",
  );
}
