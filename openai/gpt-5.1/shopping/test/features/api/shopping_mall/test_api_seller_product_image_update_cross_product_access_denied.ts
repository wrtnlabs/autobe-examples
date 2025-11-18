import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_seller_product_image_update_cross_product_access_denied(
  connection: api.IConnection,
) {
  // 1. Seller A joins and becomes authenticated
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerAJoinBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller-a.join/",
    referrer: "https://landing/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAJoin);

  // 2. As seller A, create product A
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/primary-a.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(productA);

  // 3. As admin, create category and link to product A
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.join/",
    referrer: "https://admin.referrer/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.login/",
    referrer: "https://admin.referrer/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    description_en: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 4. Switch back to seller A (admin login overwrote Authorization)
  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller-a.login/",
    referrer: "https://landing/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerALogin);

  // 5. Create a product image under product A (any authenticated actor via generic images API)
  const originalImageBody = {
    image_uri:
      "https://cdn.example.com/images/product-a-original.jpg" as string &
        tags.Format<"uri">,
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductImage.ICreate;

  const originalImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: productA.id,
      body: originalImageBody,
    });
  typia.assert<IShoppingMallProductImage>(originalImage);

  // 6. Seller B joins and logs in
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerBJoinBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller-b.join/",
    referrer: "https://landing/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerBJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBJoin);

  const sellerBLoginBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller-b.login/",
    referrer: "https://landing/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBLogin);

  // 7. Attempt cross-owner image update as seller B (should fail)
  const forbiddenUpdateBody = {
    image_uri: "https://cdn.example.com/images/product-a-hacked.jpg" as string &
      tags.Format<"uri">,
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductImage.IUpdate;

  await TestValidator.error(
    "seller B cannot update seller A's product image",
    async () => {
      await api.functional.shoppingMall.seller.products.images.update(
        connection,
        {
          productId: originalImage.shopping_mall_product_id,
          productImageId: originalImage.id,
          body: forbiddenUpdateBody,
        },
      );
    },
  );

  // 8. Log back in as seller A and successfully update the image
  const sellerALoginAgainBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller-a.login-again/",
    referrer: "https://landing/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerALoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginAgainBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerALoginAgain);

  const allowedUpdateBody = {
    image_uri:
      "https://cdn.example.com/images/product-a-updated.jpg" as string &
        tags.Format<"uri">,
    display_order: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductImage.IUpdate;

  const updatedImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.update(
      connection,
      {
        productId: originalImage.shopping_mall_product_id,
        productImageId: originalImage.id,
        body: allowedUpdateBody,
      },
    );
  typia.assert<IShoppingMallProductImage>(updatedImage);

  // 9. Validate that the update succeeded by comparing key fields
  TestValidator.notEquals(
    "seller A's update should change the image_uri",
    updatedImage.image_uri,
    originalImage.image_uri,
  );
  TestValidator.equals(
    "seller A's update keeps product association",
    updatedImage.shopping_mall_product_id,
    originalImage.shopping_mall_product_id,
  );
}
