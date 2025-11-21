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
 * Test the complete workflow of creating product variants for an existing
 * product. Seller first registers, creates a category (via admin), creates a
 * parent product, then adds variants with different configurations. Validates
 * that variants inherit proper product relationships, SKU uniqueness is
 * enforced within the product, and variant-specific pricing and inventory are
 * correctly managed.
 */
export async function test_api_product_variant_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller1234";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://shopping-mall.test/auth/seller/join",
      referrer: "https://shopping-mall.test/seller/registration",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Admin registration and category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin1234";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ canManageCategories: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Switch back to seller and create parent product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://shopping-mall.test/seller/dashboard",
      referrer: "https://shopping-mall.test/auth/seller/login",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const parentProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100>
        >(),
        status: "active",
        condition: "new",
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
          parent: category.parent,
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
  typia.assert(parentProduct);

  // 4. Create multiple variants with different configurations
  const variantConfigs = ArrayUtil.repeat(3, (index) => ({
    variant_name: `Variant ${index + 1}`,
    sku: `VAR-${parentProduct.sku}-${index + 1}`,
    price: parentProduct.price + index * 10,
    stock_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
    >(),
    attributes: JSON.stringify({
      size: ["S", "M", "L"][index % 3],
      color: ["Red", "Blue", "Green"][index % 3],
    }),
    active: true,
  }));

  const createdVariants: IShoppingMallProductVariant[] = [];

  for (const config of variantConfigs) {
    const variant =
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productId: parentProduct.id,
          body: {
            shopping_mall_product_id: parentProduct.id,
            variant_name: config.variant_name,
            sku: config.sku,
            price: config.price,
            stock_quantity: config.stock_quantity,
            attributes: config.attributes,
            active: config.active,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    typia.assert(variant);
    createdVariants.push(variant);
  }

  // 5. Validate variant relationships and properties
  TestValidator.equals(
    "all variants should reference the parent product",
    createdVariants.every((v) => v.product?.id === parentProduct.id),
    true,
  );

  TestValidator.equals(
    "variant names should be unique within the product",
    new Set(createdVariants.map((v) => v.variant_name)).size,
    createdVariants.length,
  );

  TestValidator.equals(
    "variant SKUs should be unique within the product",
    new Set(createdVariants.map((v) => v.sku)).size,
    createdVariants.length,
  );

  // 6. Test SKU uniqueness enforcement
  await TestValidator.error("duplicate SKU should fail", async () => {
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: parentProduct.id,
        body: {
          shopping_mall_product_id: parentProduct.id,
          variant_name: "Duplicate SKU Variant",
          sku: createdVariants[0].sku, // Use existing SKU
          price: parentProduct.price,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  });

  // 7. Validate variant-specific pricing and inventory
  for (const [index, variant] of createdVariants.entries()) {
    TestValidator.predicate(
      `variant ${index + 1} should have correct pricing`,
      variant.price === variantConfigs[index].price ||
        variant.price === parentProduct.price,
    );

    TestValidator.equals(
      `variant ${index + 1} should have correct inventory`,
      variant.stock_quantity,
      variantConfigs[index].stock_quantity,
    );

    TestValidator.predicate(
      `variant ${index + 1} should have valid attributes`,
      variant.attributes.length > 0,
    );
  }

  // 8. Validate product-variant relationship integrity
  TestValidator.equals(
    "all variants should be active",
    createdVariants.every((v) => v.active),
    true,
  );

  TestValidator.predicate(
    "variants should have proper timestamps",
    createdVariants.every(
      (v) =>
        v.created_at &&
        v.updated_at &&
        new Date(v.created_at) <= new Date(v.updated_at),
    ),
  );
}
