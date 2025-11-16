import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductComplianceFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductComplianceFlag";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_compliance_flag_update_change_flag_type_without_conflict(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized context
  const adminJoinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create prerequisite catalog entities (category tree and brand)
  const categoryTreeCreateBody =
    typia.random<IShoppingMallCategoryTree.ICreate>();
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  const brandCreateBody = typia.random<IShoppingMallBrand.ICreate>();
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 3. Create a product with a unique product code
  const productCreateBodyBase = typia.random<IShoppingMallProduct.ICreate>();
  const productCode: string = RandomGenerator.alphaNumeric(16);
  const productCreateBody = {
    ...productCreateBodyBase,
    code: productCode,
    shopping_mall_brand_id: brand.id,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert<IShoppingMallProduct>(product);
  TestValidator.equals(
    "created product code should match requested code",
    product.code,
    productCode,
  );

  // 4. Create an initial compliance flag for the product
  const initialFlagType = "hazardous_material";
  const initialFlagCreateBody = {
    flag_type: initialFlagType,
    is_blocking_sale: true,
    flag_value: "CLASS-9",
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const initialFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: initialFlagCreateBody,
      },
    );
  typia.assert<IShoppingMallProductComplianceFlag>(initialFlag);

  TestValidator.equals(
    "initial flag type should match requested type",
    initialFlag.flag_type,
    initialFlagType,
  );
  TestValidator.equals(
    "initial flag should be blocking sale",
    initialFlag.is_blocking_sale,
    true,
  );

  const originalFlagId = initialFlag.id;
  const originalProductId = initialFlag.shopping_mall_product_id;
  const originalCreatedAt = initialFlag.created_at;
  const originalUpdatedAt = initialFlag.updated_at;

  // 5. Update the compliance flag to a new non-conflicting flag_type
  const updatedFlagType = "region_restriction";
  const updatedNotes = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    flag_type: updatedFlagType,
    is_blocking_sale: false,
    notes: updatedNotes,
  } satisfies IShoppingMallProductComplianceFlag.IUpdate;

  const updatedFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.update(
      connection,
      {
        productCode: product.code,
        productComplianceFlagId: initialFlag.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallProductComplianceFlag>(updatedFlag);

  // 6. Assertions on identity and updated fields
  TestValidator.equals(
    "flag id remains unchanged after update",
    updatedFlag.id,
    originalFlagId,
  );
  TestValidator.equals(
    "shopping_mall_product_id remains unchanged after update",
    updatedFlag.shopping_mall_product_id,
    originalProductId,
  );
  TestValidator.equals(
    "created_at remains unchanged after update",
    updatedFlag.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "flag_type updated to new value",
    updatedFlag.flag_type,
    updatedFlagType,
  );

  TestValidator.equals(
    "is_blocking_sale updated to false",
    updatedFlag.is_blocking_sale,
    false,
  );

  TestValidator.equals(
    "notes field updated as requested",
    updatedFlag.notes,
    updatedNotes,
  );

  // If flag_value was not part of the update body, it should remain as previously stored
  TestValidator.equals(
    "flag_value remains unchanged when not updated",
    updatedFlag.flag_value,
    initialFlag.flag_value,
  );

  // Verify updated_at is later than original updated_at to reflect modification
  const originalUpdatedAtDate = new Date(originalUpdatedAt).getTime();
  const updatedUpdatedAtDate = new Date(updatedFlag.updated_at).getTime();

  TestValidator.predicate(
    "updated_at must be greater than previous updated_at after update",
    updatedUpdatedAtDate > originalUpdatedAtDate,
  );
}
