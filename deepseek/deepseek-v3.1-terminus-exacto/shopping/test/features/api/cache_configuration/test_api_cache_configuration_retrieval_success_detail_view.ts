import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
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

export async function test_api_cache_configuration_retrieval_success_detail_view(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
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
  typia.assert(superAdmin);
  // Step 2: Retrieve an existing cache configuration
  // Since we don't have a creation endpoint, we'll use typia.random to generate a valid UUID
  // In a real system, we'd need to create one first or use a known existing ID
  const configId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Call the retrieval endpoint
  const cacheConfig =
    await api.functional.ecommerce.superAdministrator.cache_configurations.at(
      superAdminConnection,
      { configId },
    );
  typia.assert(cacheConfig);
  // Step 4: Validate the response structure matches IEcommerceCacheConfiguration
  TestValidator.equals("config ID matches", cacheConfig.id, configId);
  TestValidator.predicate(
    "cache_key is non-empty string",
    typeof cacheConfig.cache_key === "string" &&
      cacheConfig.cache_key.length > 0,
  );
  TestValidator.predicate(
    "cache_type is non-empty string",
    typeof cacheConfig.cache_type === "string" &&
      cacheConfig.cache_type.length > 0,
  );
  TestValidator.predicate(
    "is_active is boolean",
    typeof cacheConfig.is_active === "boolean",
  );
  TestValidator.predicate(
    "priority is integer",
    typeof cacheConfig.priority === "number" &&
      Number.isInteger(cacheConfig.priority),
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(new Date(cacheConfig.created_at).getTime()) &&
      cacheConfig.created_at.includes("T") &&
      cacheConfig.created_at.endsWith("Z"),
  );
}
