import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
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

export async function test_api_metadata_registry_relationship_subtypes_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123@",
    },
  });
  // Generate random valid UUIDs for registry and relationship IDs
  const registryId = typia.random<string & tags.Format<"uuid">>();
  const relationshipId = typia.random<string & tags.Format<"uuid">>();
  // Test various filter combinations that should yield empty results
  const emptyTestCases: Array<{
    description: string;
    request: IEcommerceMetadataRegistryRelationship.IRequest;
  }> = [
    {
      description: "Search for non-existent user type 'customer'",
      request: {
        userType: "customer",
        page: 1,
        limit: 10,
      },
    },
    {
      description: "Search for non-existent account status 'suspended'",
      request: {
        accountStatus: "suspended",
        page: 1,
        limit: 10,
      },
    },
    {
      description: "Text search with random non-matching term",
      request: {
        search: RandomGenerator.paragraph({ sentences: 1 }),
        page: 1,
        limit: 10,
      },
    },
    {
      description: "Date range filter far in the future",
      request: {
        createdAt_from: new Date(Date.now() + 86400000 * 365).toISOString(),
        page: 1,
        limit: 10,
      },
    },
    {
      description: "Combination of non-matching filters",
      request: {
        userType: "superAdministrator",
        accountStatus: "banned",
        search: "nonexistentterm",
        createdAt_to: new Date(Date.now() - 86400000 * 365).toISOString(),
        page: 1,
        limit: 5,
      },
    },
  ];
  for (const testCase of emptyTestCases) {
    const result =
      await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.search(
        adminConnection,
        {
          registryId,
          relationshipId,
          body: testCase.request,
        },
      );
    typia.assert(result);
    // Validate empty pagination structure
    TestValidator.equals(
      `${testCase.description}: pagination.pages should be 0`,
      result.pagination.pages,
      0,
    );
    TestValidator.equals(
      `${testCase.description}: pagination.records should be 0`,
      result.pagination.records,
      0,
    );
    TestValidator.equals(
      `${testCase.description}: pagination.current should match request page`,
      result.pagination.current,
      testCase.request.page ?? 1,
    );
    TestValidator.equals(
      `${testCase.description}: pagination.limit should match request limit`,
      result.pagination.limit,
      testCase.request.limit ?? 10,
    );
    TestValidator.equals(
      `${testCase.description}: data array should be empty`,
      result.data.length,
      0,
    );
    TestValidator.predicate(
      `${testCase.description}: response should be valid IPage format`,
      () => {
        const pagination = result.pagination;
        return (
          typeof pagination.current === "number" &&
          typeof pagination.limit === "number" &&
          typeof pagination.records === "number" &&
          typeof pagination.pages === "number" &&
          Array.isArray(result.data)
        );
      },
    );
  }
}
