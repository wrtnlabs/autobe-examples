import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallVariantAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValue";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_attribute_value_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Generate a random UUID for an existing attribute value (assumes system has preset values)
  const valueId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Define updated values
  const updatedValue = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  });
  const updatedOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<9999>
  >();
  const updatedIsActive = false;
  // Step 4: Update the product variant attribute value
  const updatedAttributeValue =
    await api.functional.shoppingMall.admin.product_variants.attribute_values.update(
      adminConnection,
      {
        valueId,
        body: {
          value: updatedValue,
          order: updatedOrder,
          is_active: updatedIsActive,
        } satisfies IShoppingMallVariantAttributeValue.IUpdate,
      },
    );
  typia.assert(updatedAttributeValue);
  // Step 5: Validate that the update returned the correct values
  TestValidator.equals(
    "value was updated successfully",
    updatedAttributeValue.value,
    updatedValue,
  );
  TestValidator.equals(
    "display_order was updated successfully",
    updatedAttributeValue.display_order,
    updatedOrder,
  );
  TestValidator.equals(
    "is_active was updated successfully",
    updatedAttributeValue.is_active,
    updatedIsActive,
  );
}
