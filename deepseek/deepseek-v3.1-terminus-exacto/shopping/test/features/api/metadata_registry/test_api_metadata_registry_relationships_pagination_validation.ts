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

export async function test_api_metadata_registry_relationships_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Create metadata registry
  const registry =
    await api.functional.ecommerce.superAdministrator.metadata_registries.create(
      superAdminConnection,
      {
        body: {
          schema_name: RandomGenerator.name(1),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // Test basic pagination functionality
  const paginationTest =
    await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.index(
      superAdminConnection,
      {
        registryId: registry.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    typeof paginationTest.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof paginationTest.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records count",
    typeof paginationTest.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has total pages",
    typeof paginationTest.pagination.pages,
    "number",
  );
  // Test different page sizes
  const limitTests = [10, 25, 50] as const;
  for (const limit of limitTests) {
    const result =
      await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.index(
        superAdminConnection,
        {
          registryId: registry.id,
          body: {
            page: 1,
            limit: limit,
          } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals(
      `limit ${limit} is respected`,
      result.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `limit ${limit} has valid page count`,
      result.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `limit ${limit} has valid record count`,
      result.pagination.records >= 0,
    );
  }
  // Test boundary conditions with error handling
  const boundaryTests = [
    { page: 0, description: "page 0" },
    { page: -1, description: "negative page" },
    { page: 1000, description: "large page number" },
  ];
  for (const test of boundaryTests) {
    await TestValidator.error(
      `${test.description} should not crash`,
      async () => {
        const result =
          await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.index(
            superAdminConnection,
            {
              registryId: registry.id,
              body: {
                page: test.page,
                limit: 10,
              } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
            },
          );
        typia.assert(result);
        TestValidator.predicate(
          `${test.description} returns valid pagination`,
          result.pagination.current >= 1 && result.pagination.limit >= 1,
        );
      },
    );
  }
  // Validate pagination metadata consistency
  const consistencyTest1 =
    await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.index(
      superAdminConnection,
      {
        registryId: registry.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(consistencyTest1);
  const consistencyTest2 =
    await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.index(
      superAdminConnection,
      {
        registryId: registry.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(consistencyTest2);
  // Total records should be consistent across different pagination queries
  TestValidator.equals(
    "total records consistency across pagination calls",
    consistencyTest1.pagination.records,
    consistencyTest2.pagination.records,
  );
  // Page count calculation should be accurate
  TestValidator.equals(
    "page count calculation accuracy",
    consistencyTest1.pagination.pages,
    Math.ceil(
      consistencyTest1.pagination.records / consistencyTest1.pagination.limit,
    ),
  );
}
