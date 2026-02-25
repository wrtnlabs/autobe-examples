import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameterDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test basic search functionality for administrative category operation logs
 * without any filters applied. Verifies that the endpoint returns a properly
 * paginated list of operation records with default sorting.
 */
export async function test_api_admin_category_operations_basic_search_empty_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Search for category operations with empty filters (default pagination)
  const response =
    await api.functional.ecommerce.administrator.admin_category_operations.index(
      adminConnection,
      {
        body: {
          // Empty filters to get all records with default pagination
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure integrity
  TestValidator.predicate(
    "response has valid pagination structure",
    response.pagination !== undefined &&
      Array.isArray(response.data) &&
      response.pagination.current >= 0 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  // 4. Validate pagination consistency (if we have records)
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "data length matches limit or remaining records",
      response.data.length ===
        Math.min(response.pagination.limit, response.pagination.records) ||
        response.data.length <= response.pagination.limit,
    );
    TestValidator.predicate(
      "operations are sorted by creation date descending",
      response.data.every((op, index, array) => {
        if (index === 0) return true;
        const currentDate = new Date(op.created_at);
        const previousDate = new Date(array[index - 1].created_at);
        return currentDate <= previousDate; // descending order
      }),
    );
  }
}
