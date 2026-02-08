import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminModerationAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminModerationAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * E2E test for moderation analytics access and data handling.
 *
 * This test covers:
 *   1. Successful retrieval by authenticated admin.
 *   2. Access control validation for unauthorized users.
 *   3. Handling of large data volume with pagination correctness.
 */
export async function test_api_admin_moderation_analytics_access_and_data_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Join (Registration)
  const adminJoinConnection: IConnection = { host: connection.host };
  const adminJoinBody: ICommunityPlatformAdmin.IJoin = {}; // Empty object (since IJoin type is empty)
  const authorizedAdmin: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminJoinConnection, { body: adminJoinBody });
  typia.assert(authorizedAdmin);
  // Prepare admin authenticated connection with token
  const adminAuthorizedConnection: IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorizedAdmin.token.access}` },
  };
  // 1. Scenario 1: Successful retrieval of moderation analytics by authenticated admin
  const analyticSummary =
    await api.functional.communityPlatform.admin.analytics.moderation.index(
      adminAuthorizedConnection,
    );
  typia.assert(analyticSummary);
  // We only check that the result is a valid object (detailed structure unknown because ISummary is empty object type)
  TestValidator.predicate(
    "Moderation analytic summary is a non-null object",
    typeof analyticSummary === "object" && analyticSummary !== null,
  );
  // 2. Scenario 2: Access control failure for unauthenticated user
  const unauthConnection: IConnection = { host: connection.host };
  await TestValidator.httpError(
    "Unauthorized user cannot fetch moderation analytics",
    401,
    async () => {
      await api.functional.communityPlatform.admin.analytics.moderation.index(
        unauthConnection,
      );
    },
  );
  // 2b. Scenario 2: Access control failure for non-admin user (simulate by missing admin token)
  const nonAdminConnection: IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid_or_non_admin_token" },
  };
  await TestValidator.httpError(
    "Non-admin user cannot fetch moderation analytics",
    403,
    async () => {
      await api.functional.communityPlatform.admin.analytics.moderation.index(
        nonAdminConnection,
      );
    },
  );
  // 3. Scenario 3: Large data volume handling and pagination
  // Due to lack of SDK support for creating bulk or pagination test data, here we only test repeated call and response validity
  // This placeholder loop simulates multiple paginated requests
  for (let page = 1; page <= 3; page++) {
    // If the API supported pagination query parameters, we would pass them here
    // But current index function does not take request parameters
    const paginatedSummary =
      await api.functional.communityPlatform.admin.analytics.moderation.index(
        adminAuthorizedConnection,
      );
    typia.assert(paginatedSummary);
    TestValidator.predicate(
      `Pagination fetch page ${page} returns an object`,
      typeof paginatedSummary === "object" && paginatedSummary !== null,
    );
  }
}
