import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttribute";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_attribute_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/admin/signup" satisfies string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: adminJoinInput });
  typia.assert(adminAuthorized);
  // Step 2: Generate a valid UUID for testing
  const attributeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Call the API to retrieve the product variant attribute
  const retrievedAttribute: IShoppingMallVariantAttribute =
    await api.functional.shoppingMall.admin.product_variants.attributes.at(
      adminConnection,
      { attributeId },
    );
  typia.assert(retrievedAttribute);
  // Step 4: Validate the structure of the retrieved attribute
  // The attribute must have the correct structure as defined in IShoppingMallVariantAttribute
  TestValidator.predicate(
    "attribute ID is a valid UUID",
    typeof retrievedAttribute.id === "string" &&
      retrievedAttribute.id.length > 0,
  );
  TestValidator.predicate(
    "attribute name is a string",
    typeof retrievedAttribute.name === "string" &&
      retrievedAttribute.name.length > 0,
  );
  TestValidator.predicate(
    "attribute type is one of the allowed values",
    ["select", "text", "number", "boolean", "date"].includes(
      retrievedAttribute.type,
    ),
  );
  TestValidator.predicate(
    "attribute is_required is a boolean",
    typeof retrievedAttribute.is_required === "boolean",
  );
  TestValidator.predicate(
    "attribute is_filterable is a boolean",
    typeof retrievedAttribute.is_filterable === "boolean",
  );
  TestValidator.predicate(
    "attribute is_searchable is a boolean",
    typeof retrievedAttribute.is_searchable === "boolean",
  );
  TestValidator.predicate(
    "attribute display_order is a number",
    typeof retrievedAttribute.display_order === "number" &&
      retrievedAttribute.display_order >= 0 &&
      retrievedAttribute.display_order <= 1000,
  );
  TestValidator.predicate(
    "attribute validation_rules is null or an array",
    retrievedAttribute.validation_rules === null ||
      Array.isArray(retrievedAttribute.validation_rules),
  );
}
