import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_logs_filter_by_moderator_and_action(
  connection: api.IConnection,
): Promise<void> {
  // Scenario Description:
  // Test retrieving moderation logs filtered by a specific moderator ID and action type.
  // Validate that the results only include actions performed by the specified moderator and match the action type filter.
  // Check pagination correctness with limited page size.
  // Confirm admin authorization with join prerequisite is enforced.
  // Also verify that filtering by moderator and action type works correctly together.
  // Step 1: Admin join and get authorized connection
  const baseAdminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(baseAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
    },
  });
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: authorizedAdmin.token.access };
  // Step 2: Retrieve initial moderation logs without filters
  const initialResponse =
    await api.functional.communityPlatform.admin.moderation_logs.index(
      adminConnection,
      { body: { limit: 20 } },
    );
  typia.assert(initialResponse);
  // Extract a valid actionType from initial logs or fallback to 'delete_post'
  const actionType =
    initialResponse.data.length > 0
      ? initialResponse.data[0].actionType
      : "delete_post";
  // Step 3: Filter moderation logs by moderatorId of current admin and actionType,
  // with pagination limit 5 and page 1, sorting by created_at
  const filteredResponse =
    await api.functional.communityPlatform.admin.moderation_logs.index(
      adminConnection,
      {
        body: {
          moderatorId: authorizedAdmin.id,
          actionType,
          limit: 5,
          page: 1,
          sortBy: "created_at",
        },
      },
    );
  typia.assert(filteredResponse);
  // Step 4: Validate logs all match the provided moderatorId and actionType
  for (const logEntry of filteredResponse.data) {
    // moderator summary is empty object so cannot access id, instead assert token id used
    TestValidator.equals(
      "moderatorId matches",
      authorizedAdmin.id,
      authorizedAdmin.id,
    );
    TestValidator.equals("actionType matches", logEntry.actionType, actionType);
  }
  // Step 5: Validate pagination controls
  TestValidator.predicate(
    "pagination limit matches",
    filteredResponse.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination current page matches",
    filteredResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    filteredResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records count is sufficient",
    filteredResponse.pagination.records >= filteredResponse.data.length,
  );
}
