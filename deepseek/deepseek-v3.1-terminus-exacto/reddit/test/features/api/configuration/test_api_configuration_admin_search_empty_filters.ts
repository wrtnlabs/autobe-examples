import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_configuration_admin_search_empty_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: undefined,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Request configuration list with empty filters
  const response =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          // Empty filters - no search, no data_type, no scope, no is_active
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages count valid", response.pagination.pages >= 0);
  // Validate each configuration summary
  for (const config of response.data) {
    typia.assert(config);
  }
  // Validate pagination calculations
  TestValidator.predicate(
    "pages calculation correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
}
