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

export async function test_api_metadata_registry_admin_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Perform basic search with pagination
  const searchResult =
    await api.functional.ecommerce.administrator.metadata_registries.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistry.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination business logic
  const { pagination, data } = searchResult;
  // Test pagination calculations
  TestValidator.predicate("current page should be 1", pagination.current === 1);
  TestValidator.predicate("limit should be 10", pagination.limit === 10);
  TestValidator.predicate(
    "records count non-negative",
    pagination.records >= 0,
  );
  // Validate pagination math: pages = ceil(records / limit)
  const expectedPages = Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages calculation correct",
    pagination.pages,
    expectedPages,
  );
  // Validate data integrity
  TestValidator.predicate("data array exists", Array.isArray(data));
  // Test that data length doesn't exceed limit
  TestValidator.predicate(
    "data length <= limit",
    data.length <= pagination.limit,
  );
  // If we have data, test uniqueness of schema_name + schema_version combinations
  if (data.length > 0) {
    const uniqueCombinations = new Set(
      data.map(
        (registry) => `${registry.schema_name}:${registry.schema_version}`,
      ),
    );
    TestValidator.equals(
      "no duplicate schema combinations",
      uniqueCombinations.size,
      data.length,
    );
  }
}
