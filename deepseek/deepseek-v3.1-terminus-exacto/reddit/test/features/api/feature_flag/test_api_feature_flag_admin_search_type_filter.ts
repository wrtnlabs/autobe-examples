import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_feature_flag_admin_search_type_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test boolean flag type filtering
  const booleanResponse =
    await api.functional.communityPlatform.admin.feature_flags.index(
      adminConnection,
      {
        body: {
          flag_type: "boolean",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformFeatureFlag.IRequest,
      },
    );
  typia.assert(booleanResponse);
  // Validate all returned flags are boolean type
  TestValidator.predicate(
    "all flags should be boolean type",
    booleanResponse.data.every((flag) => flag.flag_type === "boolean"),
  );
  // Test percentage flag type filtering
  const percentageResponse =
    await api.functional.communityPlatform.admin.feature_flags.index(
      adminConnection,
      {
        body: {
          flag_type: "percentage",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformFeatureFlag.IRequest,
      },
    );
  typia.assert(percentageResponse);
  // Validate all returned flags are percentage type
  TestValidator.predicate(
    "all flags should be percentage type",
    percentageResponse.data.every((flag) => flag.flag_type === "percentage"),
  );
  // Test user_specific flag type filtering
  const userSpecificResponse =
    await api.functional.communityPlatform.admin.feature_flags.index(
      adminConnection,
      {
        body: {
          flag_type: "user_specific",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformFeatureFlag.IRequest,
      },
    );
  typia.assert(userSpecificResponse);
  // Validate all returned flags are user_specific type
  TestValidator.predicate(
    "all flags should be user_specific type",
    userSpecificResponse.data.every(
      (flag) => flag.flag_type === "user_specific",
    ),
  );
  // Test pagination with boolean filter
  const paginationResponse =
    await api.functional.communityPlatform.admin.feature_flags.index(
      adminConnection,
      {
        body: {
          flag_type: "boolean",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformFeatureFlag.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "page should be 1",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 5",
    paginationResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "records should be non-negative",
    paginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    paginationResponse.pagination.pages >= 0,
  );
  // Validate boolean flag values are appropriate
  TestValidator.predicate(
    "boolean flags should have boolean_value",
    paginationResponse.data.every(
      (flag) => flag.flag_type === "boolean" && flag.boolean_value !== null,
    ),
  );
}
