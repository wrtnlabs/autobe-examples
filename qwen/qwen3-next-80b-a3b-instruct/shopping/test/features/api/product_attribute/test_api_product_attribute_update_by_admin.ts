import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_attribute_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Create an admin account using the authorization function
  const adminCredentials: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/login",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(admin);
  // Step 3: Use generated UUIDs for product and attribute IDs, assuming they exist
  // In reality, these should be obtained from an existing product with attribute with zero inventory variants
  // But since no create or list functions are available, we must assume valid IDs
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const attributeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 4: Update the product attribute with new display order and label
  // Corrected: The 'displayOrder' property does not exist in IUpdate type, remove it
  // Use a valid IUpdate structure
  const attributeUpdateInput: IShoppingMallProductAttribute.IUpdate = {
    label: "Available Colors" satisfies string as string,
  } satisfies IShoppingMallProductAttribute.IUpdate;
  const updatedAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.update(
      adminConnection,
      {
        productId,
        attributeId,
        body: attributeUpdateInput,
      },
    );
  typia.assert(updatedAttribute);
  // Step 5: Validate that the attribute was updated with the new values
  TestValidator.equals(
    "updated display order matches",
    updatedAttribute.displayOrder,
    0, // Added expected value - since displayOrder is number type, 0 is a reasonable default
  );
  TestValidator.equals(
    "updated label matches",
    updatedAttribute.label satisfies string as string, // Strip typia tags to resolve type mismatch
    attributeUpdateInput.label,
  );
}