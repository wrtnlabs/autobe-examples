import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryFieldDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_metadata_registry_field_definitions_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Generate valid UUID registry ID
  const registryId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Search with multiple filters
  const currentDate = new Date();
  const createdAfter = new Date(
    currentDate.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdBefore = new Date(
    currentDate.getTime() - 1 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedAfter = new Date(
    currentDate.getTime() - 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedBefore = new Date(
    currentDate.getTime() - 1 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const filteredResponse =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      superAdminConnection,
      {
        registryId,
        body: {
          search: "name",
          field_type: "string",
          is_required: true,
          created_after: createdAfter,
          created_before: createdBefore,
          updated_after: updatedAfter,
          updated_before: updatedBefore,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "filtered search pagination current page",
    filteredResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered search pagination limit",
    filteredResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "filtered search pagination records non-negative",
    filteredResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered search pagination pages non-negative",
    filteredResponse.pagination.pages >= 0,
  );
  // Validate summary objects structure
  if (filteredResponse.data.length > 0) {
    const summary = filteredResponse.data[0];
    TestValidator.predicate(
      "summary has valid id",
      typeof summary.id === "string" && summary.id.length > 0,
    );
    TestValidator.predicate(
      "summary has valid field_name",
      typeof summary.field_name === "string" && summary.field_name.length > 0,
    );
    TestValidator.predicate(
      "summary has valid field_type",
      typeof summary.field_type === "string" && summary.field_type.length > 0,
    );
    TestValidator.predicate(
      "summary has valid is_required",
      typeof summary.is_required === "boolean",
    );
    TestValidator.predicate(
      "summary has valid created_at",
      typeof summary.created_at === "string" &&
        !isNaN(Date.parse(summary.created_at)),
    );
  }
  // Test 2: Search without filters (should return all fields)
  const unfilteredResponse =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      superAdminConnection,
      {
        registryId,
        body: {} satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(unfilteredResponse);
  // Test 3: Search with maximum limit
  const maxLimitResponse =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      superAdminConnection,
      {
        registryId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit correctly applied",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Test 4: Search for optional fields
  const optionalResponse =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      superAdminConnection,
      {
        registryId,
        body: {
          is_required: false,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(optionalResponse);
  // Test 5: Search with null requirement status (should return both required and optional)
  const mixedResponse =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      superAdminConnection,
      {
        registryId,
        body: {
          is_required: null,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(mixedResponse);
  // Test 6: Validate authorization - only super administrator can access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      unauthorizedConnection,
      {
        registryId,
        body: {} satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  });
}
