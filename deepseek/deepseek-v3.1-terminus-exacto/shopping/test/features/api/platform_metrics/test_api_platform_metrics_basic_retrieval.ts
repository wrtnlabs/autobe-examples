import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_platform_metrics_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Prepare minimal filtering parameters using typia.random for tagged types
  const requestBody = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEcommerceCacheConfigurationParameter.IRequest;
  // Call platform metrics endpoint
  const result =
    await api.functional.ecommerce.administrator.platform_metrics.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(result);
  // Validate pagination structure
  typia.assert(result.pagination);
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.predicate(
    "total records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculation",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit) ||
      (result.pagination.records === 0 && result.pagination.pages === 0),
  );
  // Validate each metric summary - typia.assert() already validated structure
  // Verify sorting by collection_timestamp descending by default
  for (let i = 0; i < result.data.length - 1; i++) {
    const current = new Date(result.data[i].collection_timestamp);
    const next = new Date(result.data[i + 1].collection_timestamp);
    TestValidator.predicate("sorted descending", current >= next);
  }
}
