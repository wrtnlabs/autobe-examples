import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttribute";
import type { IShoppingMallVariantAttributeValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValidation";
import type { IShoppingMallVariantCompatibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantCompatibility";
import type { IShoppingMallVariantTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantTemplate";
import type { IShoppingMallVariantTemplateDefaultValues } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantTemplateDefaultValues";
import { prepare_random_shopping_mall_variant_attribute } from "../../../prepare/prepare_random_shopping_mall_variant_attribute";
import { prepare_random_shopping_mall_variant_template } from "../../../prepare/prepare_random_shopping_mall_variant_template";
import { generate_random_shopping_mall_admin_products_templates_create } from "../../../generate/generate_random_shopping_mall_admin_products_templates_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_template_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a random product ID (assumed to exist in test environment)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Create a product variant template with two attributes
  // Define attribute 1: size (required)
  const attribute1: IShoppingMallVariantAttribute.ICreate = {
    name: "size",
    type: "select",
    required: true,
    validation: {
      minLength: 1,
      maxLength: 20,
    } satisfies IShoppingMallVariantAttributeValidation,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    product_id: productId,
  };
  // Define attribute 2: color (optional)
  const attribute2: IShoppingMallVariantAttribute.ICreate = {
    name: "color",
    type: "select",
    required: false,
    validation: {
      minLength: 1,
      maxLength: 20,
    } satisfies IShoppingMallVariantAttributeValidation,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    product_id: productId,
  };
  // Create template with attributes only (compatibility rules removed due to server-generated ID requirement)
  const template: IShoppingMallVariantTemplate =
    await api.functional.shoppingMall.admin.products.templates.create(
      adminConnection,
      {
        productId,
        body: {
          name: "Electronics - Size and Color",
          description:
            "Template for electronic products with size and color variants",
          is_active: true,
          attribute_configs: [
            attribute1,
            attribute2,
          ] satisfies IShoppingMallVariantAttribute.ICreate[] &
            tags.MinItems<1> &
            tags.MaxItems<20>,
        } satisfies IShoppingMallVariantTemplate.ICreate,
      },
    );
  typia.assert(template);
  // Step 4: Validate template creation
  TestValidator.equals(
    "template name is set correctly",
    template.name,
    "Electronics - Size and Color",
  );
  TestValidator.equals(
    "template description is set correctly",
    template.description,
    "Template for electronic products with size and color variants",
  );
  TestValidator.equals(
    "template has exactly 2 attributes",
    template.attributes.length,
    2,
  );
  TestValidator.equals(
    "template has no compatibility rules",
    template.compatibility_rules?.length,
    0,
  );
}