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
export async function test_api_product_variant_template_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin with proper connection isolation
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
  // Step 2: Create a product variant template using the provided utility function
  // First, generate attribute IDs that will be used in compatibility rules
  const colorAttributeId = typia.random<string & tags.Format<"uuid">>();
  const sizeAttributeId = typia.random<string & tags.Format<"uuid">>();
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Define the compatibility rules using the correct IArray format
  const template =
    await generate_random_shopping_mall_admin_products_templates_create(
      adminConnection,
      {
        body: {
          name: "Color and Size Template",
          description: "Template for color and size variant selection",
          is_active: true,
          attribute_configs: [
            {
              name: "Color",
              description: "Product color option",
              type: "select",
              required: true,
              category_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: productId,
            } satisfies IShoppingMallVariantAttribute.ICreate,
            {
              name: "Size",
              description: "Product size option",
              type: "select",
              required: true,
              category_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: productId,
            } satisfies IShoppingMallVariantAttribute.ICreate,
          ],
          compatibility_rules: [
            {
              items: [colorAttributeId, sizeAttributeId],
            } satisfies IShoppingMallVariantCompatibility.IArray,
            {
              items: [colorAttributeId, sizeAttributeId],
            } satisfies IShoppingMallVariantCompatibility.IArray,
          ],
        } satisfies IShoppingMallVariantTemplate.ICreate,
        params: {
          productId: productId,
        },
      },
    );
  typia.assert(template);
  // Step 4: Retrieve the product variant template to validate complete configuration
  const templateId = template.id || "default-template-id";
  const retrievedTemplate: IShoppingMallVariantTemplate =
    await api.functional.shoppingMall.products.templates.at(adminConnection, {
      productId: productId,
      templateId: templateId,
    });
  typia.assert(retrievedTemplate);
  // Step 5: Validate template integrity and configuration
  TestValidator.equals(
    "template name matches",
    retrievedTemplate.name,
    template.name,
  );
  TestValidator.equals(
    "template description matches",
    retrievedTemplate.description,
    template.description,
  );
  TestValidator.equals(
    "template has same number of attributes",
    retrievedTemplate.attributes.length,
    template.attributes.length,
  );
  // Compatibility rules are now correctly structured
  TestValidator.equals(
    "template has two compatibility rules",
    retrievedTemplate.compatibility_rules?.length,
    2,
  );
  // default_values from the base interface is nullable but not required in ICreate
  TestValidator.equals(
    "template has correct number of default values",
    Object.keys(retrievedTemplate.default_values || {}).length,
    0,
  );
}
