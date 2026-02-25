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

export async function test_api_admin_analytics_configurations_empty_dataset(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Call analytics endpoint with empty request to test minimal/no configurations
  const analyticsResponse =
    await api.functional.communityPlatform.admin.analytics.configurations.index(
      adminConnection,
      {
        body: {
          // Empty request to retrieve all configurations without filtering
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Validate pagination metadata for empty dataset
  TestValidator.equals(
    "pagination current page",
    analyticsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    analyticsResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records",
    analyticsResponse.pagination.records,
    0,
  );
  TestValidator.equals("total pages", analyticsResponse.pagination.pages, 0);
  // Validate empty data array
  TestValidator.equals(
    "empty data array length",
    analyticsResponse.data.length,
    0,
  );
  // Test with explicit page and limit parameters using proper type conversion
  const pageValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const limitValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;
  const analyticsResponseWithParams =
    await api.functional.communityPlatform.admin.analytics.configurations.index(
      adminConnection,
      {
        body: {
          page: pageValue,
          limit: limitValue,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(analyticsResponseWithParams);
  // Validate pagination metadata consistency
  TestValidator.equals(
    "pagination current page with params",
    analyticsResponseWithParams.pagination.current,
    pageValue,
  );
  TestValidator.equals(
    "pagination limit with params",
    analyticsResponseWithParams.pagination.limit,
    limitValue,
  );
  TestValidator.equals(
    "total records with params",
    analyticsResponseWithParams.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages with params",
    analyticsResponseWithParams.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty data array with params",
    analyticsResponseWithParams.data.length,
    0,
  );
}
