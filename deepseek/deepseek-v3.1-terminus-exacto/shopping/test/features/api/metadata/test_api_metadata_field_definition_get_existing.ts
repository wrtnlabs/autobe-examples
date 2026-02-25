import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_metadata_field_definition_get_existing(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection with authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(authResult);
  // Generate valid UUIDs for registry and field definition
  const registryId = typia.random<string & tags.Format<"uuid">>();
  const fieldId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the field definition metadata
  const fieldDefinition =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.at(
      superAdminConnection,
      {
        registryId,
        fieldId,
      },
    );
  typia.assert(fieldDefinition);
  // Validate all expected properties are present
  TestValidator.predicate(
    "field definition has id",
    () => fieldDefinition.id === fieldId,
  );
  TestValidator.predicate(
    "field name is non-empty string",
    () =>
      typeof fieldDefinition.field_name === "string" &&
      fieldDefinition.field_name.length > 0,
  );
  TestValidator.predicate(
    "field type is defined",
    () =>
      typeof fieldDefinition.field_type === "string" &&
      fieldDefinition.field_type.length > 0,
  );
  TestValidator.predicate(
    "is_required is boolean",
    () => typeof fieldDefinition.is_required === "boolean",
  );
  TestValidator.predicate(
    "registry ID matches",
    () => fieldDefinition.ecommerce_metadata_registry_id === registryId,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    () =>
      typeof fieldDefinition.created_at === "string" &&
      !isNaN(Date.parse(fieldDefinition.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    () =>
      typeof fieldDefinition.updated_at === "string" &&
      !isNaN(Date.parse(fieldDefinition.updated_at)),
  );
}
