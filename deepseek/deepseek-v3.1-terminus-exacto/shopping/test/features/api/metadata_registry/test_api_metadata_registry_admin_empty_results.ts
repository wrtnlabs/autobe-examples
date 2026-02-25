import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_metadata_registry_admin_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using join
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password:
        typia.random<string & tags.Format<"password">>() ||
        RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create highly specific filtering criteria that should yield no results
  const searchCriteria = {
    schema_name: "non_existent_schema_" + RandomGenerator.alphabets(10),
    schema_version: "999.999.999",
    is_active: true,
    created_after: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 365 * 10,
    ).toISOString(), // 10 years in future
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies IEcommerceMetadataRegistry.IRequest;
  // Perform metadata registry search
  const result =
    await api.functional.ecommerce.administrator.metadata_registries.index(
      adminConnection,
      { body: searchCriteria },
    );
  typia.assert(result);
  // Validate empty results array
  TestValidator.equals("data array should be empty", result.data, []);
  TestValidator.equals("data length should be 0", result.data.length, 0);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    result.pagination.limit,
    searchCriteria.limit!,
  );
  TestValidator.equals(
    "total records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals("total pages should be 0", result.pagination.pages, 0);
}
