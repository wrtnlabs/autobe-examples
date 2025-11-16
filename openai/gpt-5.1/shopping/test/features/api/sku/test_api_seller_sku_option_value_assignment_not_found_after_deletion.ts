import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSkuOptionValueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionValueAssignment";

export async function test_api_seller_sku_option_value_assignment_not_found_after_deletion(
  connection: api.IConnection,
) {
  // 1. Register seller and obtain authorized session
  const sellerJoinBody = typia.random<IShoppingMallSellerJoin.IRequest>();
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerId = sellerAuthorized.id;

  // 2. Register platform admin and login for brand creation
  const platformAdminJoinBody =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  const platformAdminLoginBody: IShoppingMallPlatformAdminLogin.IRequest = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: platformAdminJoinBody.ip ?? null,
    href: platformAdminJoinBody.href,
    referrer: platformAdminJoinBody.referrer,
  };
  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminLoggedIn);

  // 3. Create a brand as platform admin
  const brandCreateBody = typia.random<IShoppingMallBrand.ICreate>();
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 4. Switch back to seller context by logging in as seller
  const sellerLoginBody: IShoppingMallSellerLogin.IRequest = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);
  TestValidator.equals(
    "seller id must be same after login",
    sellerLoggedIn.id,
    sellerId,
  );

  // 5. Create a product as seller associated with the created brand
  const productCode = RandomGenerator.alphaNumeric(12);
  const productCreateBody: IShoppingMallProduct.ICreate = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  };
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);
  TestValidator.equals("product code must match", product.code, productCode);
  TestValidator.equals(
    "product's brand id must match created brand",
    product.brand?.id,
    brand.id,
  );

  // 6. Create an option type for the product
  const optionTypeCreateBody: IShoppingMallProductOptionType.ICreate = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // For assignment body, we need business-visible codes for option type/value.
  // The optionType DTO does not expose a code, so we will define our own
  // business codes to reuse in assignment creation and assertions.
  const productOptionTypeCode = RandomGenerator.alphaNumeric(8);

  // 7. Create an option value for that option type
  const optionValueCreateBody: IShoppingMallProductOptionValue.ICreate = {
    value: RandomGenerator.alphaNumeric(6),
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  };
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  const productOptionValueCode = RandomGenerator.alphaNumeric(6);

  // 8. Create a SKU under the product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuCreateBody: IShoppingMallProductSku.ICreate = {
    code: skuCode,
    name: "SKU-Color-Red",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  };
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);
  TestValidator.equals("sku code must match", sku.code, skuCode);
  TestValidator.equals(
    "sku productCode must match",
    sku.productCode,
    product.code,
  );

  // 9. Create a SKU option value assignment
  const assignmentCreateBody: IShoppingMallSkuOptionValueAssignment.ICreate = {
    productOptionTypeCode,
    productOptionValueCode,
    orderIndex: 0 as number & tags.Type<"int32">,
  };
  const assignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuOptionValueAssignment>(assignment);
  TestValidator.equals(
    "assignment productCode must match",
    assignment.productCode,
    product.code,
  );
  TestValidator.equals(
    "assignment skuCode must match",
    assignment.skuCode,
    sku.code,
  );
  TestValidator.equals(
    "assignment option type code must match",
    assignment.productOptionTypeCode,
    productOptionTypeCode,
  );
  TestValidator.equals(
    "assignment option value code must match",
    assignment.productOptionValueCode,
    productOptionValueCode,
  );

  // 10. Verify the assignment exists via GET detail endpoint
  const loaded: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.at(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        skuOptionValueAssignmentId: assignment.id,
      },
    );
  typia.assert<IShoppingMallSkuOptionValueAssignment>(loaded);
  TestValidator.equals(
    "loaded assignment id must match created assignment",
    loaded.id,
    assignment.id,
  );

  // 11. Delete the assignment
  await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.erase(
    connection,
    {
      productCode: product.code,
      skuCode: sku.code,
      skuOptionValueAssignmentId: assignment.id as string & tags.Format<"uuid">,
    },
  );

  // 12. After deletion, GET detail should now fail (not-found style error)
  await TestValidator.error(
    "deleted assignment should not be retrievable",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.at(
        connection,
        {
          productCode: product.code,
          skuCode: sku.code,
          skuOptionValueAssignmentId: assignment.id,
        },
      );
    },
  );
}
