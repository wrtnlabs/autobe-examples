import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttribute";
import { prepare_random_shopping_mall_product_variant_attribute } from "../../../prepare/prepare_random_shopping_mall_product_variant_attribute";
import { generate_random_shopping_mall_admin_product_variants_attributes_create } from "../../../generate/generate_random_shopping_mall_admin_product_variants_attributes_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_attribute_create_valid(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
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
  typia.assert(adminAuth);
  // Step 2: Create product variant attribute with valid parameters
  const testName = RandomGenerator.name();
  const testDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const createdAttribute: IShoppingMallProductVariantAttribute =
    await generate_random_shopping_mall_admin_product_variants_attributes_create(
      adminConnection,
      {
        body: {
          name: testName,
          description: testDescription,
          type: "string",
        } satisfies IShoppingMallProductVariantAttribute.ICreate,
      },
    );
  typia.assert(createdAttribute);
  // Step 3: Validate returned attribute properties
  TestValidator.equals(
    "attribute name matches request",
    createdAttribute.name,
    testName,
  );
  TestValidator.equals(
    "attribute display name matches the name",
    createdAttribute.displayName,
    testName,
  );
  TestValidator.equals(
    "attribute description matches request",
    createdAttribute.description,
    testDescription,
  );
  TestValidator.equals(
    "attribute type matches request",
    createdAttribute.attributeType,
    "string",
  );
  TestValidator.equals(
    "attribute is not required by default",
    createdAttribute.isRequired,
    false,
  );
  TestValidator.equals(
    "attribute is not filterable by default",
    createdAttribute.isFilterable,
    false,
  );
  TestValidator.equals(
    "attribute is not comparative by default",
    createdAttribute.isComparative,
    false,
  );
  TestValidator.equals(
    "attribute has default sort order",
    createdAttribute.sortOrder,
    0,
  );
  TestValidator.equals(
    "attribute status is active",
    createdAttribute.status,
    "active",
  );
  typia.assert<"uuid">(createdAttribute.id);
}