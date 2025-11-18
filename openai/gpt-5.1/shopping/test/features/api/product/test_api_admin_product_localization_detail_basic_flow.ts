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
import type { IShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductLocalization";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_product_localization_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. Prepare deterministic emails and URLs for admin and seller joins
  const sellerEmail: string = `seller_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminEmail: string = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;

  const href: string = "https://admin.shoppingmall.test/join";
  const referrer: string = "https://shoppingmall.test/landing";

  // 2. Join seller account
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!", // matches password format tag
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // 3. Seller login to ensure token is properly set (even though join already set it)
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!",
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/seller-login",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4. As seller, create a base product
  const productBody = {
    code: `CODE-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: "https://cdn.shoppingmall.test/images/primary.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. As seller, create a localization for the created product
  const locale: string = "en-US";
  const localizationTitle: string = RandomGenerator.paragraph({ sentences: 2 });
  const localizationSummary: string = RandomGenerator.paragraph({
    sentences: 4,
  });
  const localizationDescription: string = RandomGenerator.content({
    paragraphs: 3,
  });

  const localizationCreateBody = {
    locale,
    title: localizationTitle,
    summary: localizationSummary,
    description: localizationDescription,
  } satisfies IShoppingMallProductLocalization.ICreate;

  const createdLocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: product.id,
        body: localizationCreateBody,
      },
    );
  typia.assert(createdLocalization);

  // Business sanity checks on created localization
  TestValidator.equals(
    "created localization product_id matches product.id",
    createdLocalization.product_id,
    product.id,
  );
  TestValidator.equals(
    "created localization locale matches input locale",
    createdLocalization.locale,
    locale,
  );
  TestValidator.equals(
    "created localization title matches input",
    createdLocalization.title,
    localizationTitle,
  );
  TestValidator.equals(
    "created localization summary matches input",
    createdLocalization.summary,
    localizationSummary,
  );
  TestValidator.equals(
    "created localization description matches input",
    createdLocalization.description,
    localizationDescription,
  );

  // 6. Join admin account
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/admin-landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 7. Admin login (to ensure explicit admin context)
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/admin-login",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 8. As admin, create a category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 9. As admin, link product to the created category
  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  TestValidator.equals(
    "product-category link product id matches product.id",
    productCategory.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "product-category link category id matches category.id",
    productCategory.shopping_mall_category_id,
    category.id,
  );

  // 10. As admin, retrieve the localization detail via admin endpoint
  const fetchedLocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.admin.products.localizations.at(
      connection,
      {
        productId: product.id,
        productLocalizationId: createdLocalization.id,
      },
    );
  typia.assert(fetchedLocalization);

  // 11. Validate that fetched localization matches what was created
  TestValidator.equals(
    "fetched localization id matches created",
    fetchedLocalization.id,
    createdLocalization.id,
  );
  TestValidator.equals(
    "fetched localization product_id matches product.id",
    fetchedLocalization.product_id,
    product.id,
  );
  TestValidator.equals(
    "fetched localization locale matches created",
    fetchedLocalization.locale,
    createdLocalization.locale,
  );
  TestValidator.equals(
    "fetched localization title matches created",
    fetchedLocalization.title,
    createdLocalization.title,
  );
  TestValidator.equals(
    "fetched localization summary matches created",
    fetchedLocalization.summary,
    createdLocalization.summary,
  );
  TestValidator.equals(
    "fetched localization description matches created",
    fetchedLocalization.description,
    createdLocalization.description,
  );
}
