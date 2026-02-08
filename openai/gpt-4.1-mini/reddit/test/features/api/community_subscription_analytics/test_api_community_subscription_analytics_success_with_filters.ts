import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_subscription_analytics_success_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving a paginated list and analytical summaries of community subscriptions with valid admin authorization.
  // Step 1: Admin user join (registration) to obtain authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: ICommunityPlatformAdmin.IJoin = {};
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Step 2: Use empty request body as no filter or pagination properties exist
  const requestBody: ICommunityPlatformCommunitySubscription.IRequest = {};
  // Step 3: Call analytics subscriptions endpoint
  const response =
    await api.functional.communityPlatform.admin.analytics.communities.subscriptions.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // Step 4: Basic visibility validation
  TestValidator.predicate(
    "pagination current page is >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is >= 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records are >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are >= 0",
    response.pagination.pages >= 0,
  );
  // Step 5: Authorization Enforcement
  const unauthConnection: api.IConnection = { host: connection.host };
  // calling without Authorization header should fail
  await TestValidator.httpError(
    "Unauthorized request fails without token",
    401,
    async () => {
      await api.functional.communityPlatform.admin.analytics.communities.subscriptions.index(
        unauthConnection,
        { body: {} },
      );
    },
  );
}
