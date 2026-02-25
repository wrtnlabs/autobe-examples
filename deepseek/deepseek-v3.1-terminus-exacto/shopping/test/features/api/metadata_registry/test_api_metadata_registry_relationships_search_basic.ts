import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import type { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_metadata_registries_create } from "../../../generate/generate_random_ecommerce_administrator_metadata_registries_create";
import { prepare_random_ecommerce_metadata_registry } from "../../../prepare/prepare_random_ecommerce_metadata_registry";

export async function test_api_metadata_registry_relationships_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Setup administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create a metadata registry
  const registry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.paragraph({ sentences: 1 }),
          schema_version: "1.0.0",
          description: "Test registry for relationship search testing",
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // Test basic search with no filters - should return paginated results
  const searchResult =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          // Empty request to get all relationships for this registry
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(searchResult.data),
  );
  // Validate pagination properties
  TestValidator.predicate(
    "current page is non-negative",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Test search with explicit pagination parameters
  const paginatedResult =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate paginated results structure
  TestValidator.equals(
    "page should be 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be respected",
    paginatedResult.pagination.limit <= 10,
  );
  // If there are relationships returned, validate their structure
  if (searchResult.data.length > 0) {
    const relationship = searchResult.data[0];
    TestValidator.predicate(
      "relationship has id",
      relationship.id !== undefined,
    );
    TestValidator.predicate(
      "relationship has action type",
      relationship.action_type !== undefined,
    );
    TestValidator.predicate(
      "relationship has description",
      relationship.general_description !== undefined,
    );
    TestValidator.predicate(
      "relationship has creation timestamp",
      relationship.created_at !== undefined,
    );
    // Verify timestamp format is ISO 8601
    TestValidator.predicate(
      "timestamp is valid ISO format",
      typeof relationship.created_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(relationship.created_at),
    );
    // Validate administrator/super administrator references if present
    if (relationship.administrator !== null) {
      TestValidator.predicate(
        "administrator has id",
        relationship.administrator.id !== undefined,
      );
      TestValidator.predicate(
        "administrator has email",
        relationship.administrator.email !== undefined,
      );
      TestValidator.predicate(
        "administrator has creation timestamp",
        relationship.administrator.created_at !== undefined,
      );
    }
    if (relationship.superAdministrator !== null) {
      TestValidator.predicate(
        "super administrator has id",
        relationship.superAdministrator.id !== undefined,
      );
      TestValidator.predicate(
        "super administrator has email",
        relationship.superAdministrator.email !== undefined,
      );
      TestValidator.predicate(
        "super administrator has creation timestamp",
        relationship.superAdministrator.created_at !== undefined,
      );
    }
  }
  // Test search with search text parameter
  const searchTextResult =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          search: "test",
          page: 1,
          limit: 5,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchTextResult);
  // Test error handling for invalid registry ID
  await TestValidator.httpError(
    "should return 404 for non-existent registry",
    404,
    async () => {
      await api.functional.ecommerce.administrator.metadata_registries.relationships.index(
        adminConnection,
        {
          registryId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IEcommerceMetadataRegistryRelationship.IRequest,
        },
      );
    },
  );
}
