import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_metadata_registry_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://test.com",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Test default pagination (page=1, limit=20)
  const defaultResponse =
    await api.functional.ecommerce.superAdministrator.metadata_registries.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMetadataRegistry.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure present",
    "pagination" in defaultResponse,
    true,
  );
  TestValidator.equals("data array present", "data" in defaultResponse, true);
  // Validate pagination metadata
  const pagination = defaultResponse.pagination;
  TestValidator.equals("current page should be 1", pagination.current, 1);
  TestValidator.equals("limit should be 20", pagination.limit, 20);
  await TestValidator.predicate(
    "records count should be non-negative",
    async () => pagination.records >= 0,
  );
  await TestValidator.predicate(
    "pages count should be non-negative",
    async () => pagination.pages >= 0,
  );
  if (pagination.records > 0 && pagination.limit > 0) {
    TestValidator.equals(
      "pages should be calculated correctly",
      pagination.pages,
      Math.ceil(pagination.records / pagination.limit),
    );
  }
  // Validate metadata registry summaries
  for (const registry of defaultResponse.data) {
    typia.assert<IEcommerceMetadataRegistry.ISummary>(registry);
    await TestValidator.predicate("id should be UUID format", async () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        registry.id,
      ),
    );
    await TestValidator.predicate(
      "schema_name should be string",
      async () => typeof registry.schema_name === "string",
    );
    await TestValidator.predicate(
      "schema_version should be string",
      async () => typeof registry.schema_version === "string",
    );
    await TestValidator.predicate(
      "is_active should be boolean",
      async () => typeof registry.is_active === "boolean",
    );
    await TestValidator.predicate(
      "created_at should be ISO datetime",
      async () =>
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(registry.created_at),
    );
    await TestValidator.predicate(
      "updated_at should be ISO datetime",
      async () =>
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(registry.updated_at),
    );
  }
  // Test page beyond total pages
  if (pagination.pages > 0) {
    const beyondPageResponse =
      await api.functional.ecommerce.superAdministrator.metadata_registries.index(
        superAdminConnection,
        {
          body: {
            page: pagination.pages + 10,
            limit: 20,
          } satisfies IEcommerceMetadataRegistry.IRequest,
        },
      );
    typia.assert(beyondPageResponse);
    TestValidator.equals(
      "beyond page should return empty data",
      beyondPageResponse.data.length,
      0,
    );
    TestValidator.equals(
      "beyond page current should match request",
      beyondPageResponse.pagination.current,
      pagination.pages + 10,
    );
    TestValidator.equals(
      "total records should remain same",
      beyondPageResponse.pagination.records,
      pagination.records,
    );
  }
  // Test authorization - attempt without authentication
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should reject unauthorized access",
    [401, 403],
    async () => {
      await api.functional.ecommerce.superAdministrator.metadata_registries.index(
        unauthorizedConnection,
        {
          body: {
            page: 1,
            limit: 20,
          } satisfies IEcommerceMetadataRegistry.IRequest,
        },
      );
    },
  );
}
