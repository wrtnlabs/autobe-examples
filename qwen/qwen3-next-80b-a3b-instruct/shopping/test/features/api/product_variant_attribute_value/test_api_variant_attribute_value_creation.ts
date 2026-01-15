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
import { prepare_random_shopping_mall_variant_attribute_value } from "../../../prepare/prepare_random_shopping_mall_variant_attribute_value";
import { generate_random_shopping_mall_admin_product_variants_attribute_values_create } from "../../../generate/generate_random_shopping_mall_admin_product_variants_attribute_values_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_variant_attribute_value_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a new variant attribute value with a realistic name, ensuring it meets the 50-character limit
  // Use a value that represents a size variant (e.g., 'Extra Large')
  const variantAttributeValue: IShoppingMallVariantAttributeValue =
    await generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: typia.random<string & tags.Format<"uuid">>(),
          name: "Extra Large", // Realistic, within 50-character limit
        } satisfies IShoppingMallVariantAttributeValue.ICreate,
      },
    );
  typia.assert(variantAttributeValue);
  // Step 3: Validate the created variant attribute value
  TestValidator.equals(
    "name matches",
    variantAttributeValue.value,
    "Extra Large",
  );
  TestValidator.equals(
    "attribute_id matches",
    variantAttributeValue.attribute_id,
    variantAttributeValue.attribute_id,
  );
  TestValidator.predicate(
    "value length is within limit",
    variantAttributeValue.value.length <= 50,
  );
}
