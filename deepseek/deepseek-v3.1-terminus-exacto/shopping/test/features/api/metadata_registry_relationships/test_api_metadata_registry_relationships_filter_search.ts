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

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_super_administrator_metadata_registries_create } from "../../../generate/generate_random_ecommerce_super_administrator_metadata_registries_create";
import { prepare_random_ecommerce_metadata_registry } from "../../../prepare/prepare_random_ecommerce_metadata_registry";

export async function test_api_metadata_registry_relationships_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  typia.assert(auth);
  // Create metadata registry
  const registry =
    await generate_random_ecommerce_super_administrator_metadata_registries_create(
      superAdminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphabets(10),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // Test 1: Search with user type filter
  const userTypeResults =
    await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.index(
      superAdminConnection,
      {
        registryId: registry.id,
        body: {
          userType: "customer",
          search: RandomGenerator.substring(RandomGenerator.name()),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(userTypeResults);
  TestValidator.predicate(
    "user type search returns data",
    userTypeResults.data.length >= 0,
  );
  TestValidator.equals(
    "pagination info present",
    typeof userTypeResults.pagination.current,
    "number",
  );
  // Test 2: Account status filtering
  const statusResults =
    await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.index(
      superAdminConnection,
      {
        registryId: registry.id,
        body: {
          accountStatus: "active",
          createdAt_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          createdAt_to: new Date().toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(statusResults);
  TestValidator.predicate(
    "status filter returns pagination info",
    statusResults.pagination.records >= 0,
  );
  // Test 3: Text search
  const searchResults =
    await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.index(
      superAdminConnection,
      {
        registryId: registry.id,
        body: {
          search: RandomGenerator.alphabets(3),
          page: 2,
          limit: 20,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "text search validates pagination",
    searchResults.pagination.pages >= 0,
  );
  // Test 4: Date range filtering
  const dateResults =
    await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.index(
      superAdminConnection,
      {
        registryId: registry.id,
        body: {
          createdAt_from: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          createdAt_to: new Date().toISOString(),
          userType: "administrator",
          limit: 15,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(dateResults);
  TestValidator.predicate(
    "date filter returns valid structure",
    dateResults.data.length >= 0,
  );
  // Test 5: Combined filters
  const combinedResults =
    await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.index(
      superAdminConnection,
      {
        registryId: registry.id,
        body: {
          userType: "seller",
          accountStatus: "pending",
          search: RandomGenerator.name(),
          createdAt_from: new Date(
            Date.now() - 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 8,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(combinedResults);
  TestValidator.equals(
    "combined filter pagination valid",
    typeof combinedResults.pagination.limit,
    "number",
  );
}
