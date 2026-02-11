import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemNotification";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunitySystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_system_notifications_owner_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityCommunityOwner.IJoin;
  await authorize_community_owner_join(ownerConnection, {
    body: ownerCredentials,
  });
  // 2. Login as community owner to get valid token (using same IJoin structure as credentials)
  const loginResponse = await authorize_community_owner_login(ownerConnection, {
    body: {
      email: ownerCredentials.email,
      password: ownerCredentials.password,
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  // 3. Create fresh connection with authentication token
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: `Bearer ${loginResponse.token.access}`,
  };
  // 4. Retrieve system notifications with pagination
  const paginationParams = {
    page: 1,
    limit: 25,
  } satisfies IRedditCommunitySystemNotification.IRequest;
  const notifications =
    await api.functional.redditCommunity.system_notifications.index(
      authConnection,
      {
        body: paginationParams,
      },
    );
  typia.assert(notifications);
  // 5. Validate response structure
  TestValidator.equals(
    "pagination has correct current page",
    notifications.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has correct limit",
    notifications.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "pagination has at least 25 records",
    notifications.pagination.records >= 25,
  );
  TestValidator.equals(
    "notifications array has exactly 25 items",
    notifications.data.length,
    25,
  );
  // 6. Validate each notification has required fields (only validate the fields specified in scenario - message and created_at are guaranteed by typia.assert and the DTO definition)
  // No manual checks needed beyond typia.assert - these are redundant per rule 8.2
  // 7. Test access denied for non-owner (attempt to access without authentication)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // This should fail with 401 Unauthorized as we're not authenticated
  await TestValidator.httpError(
    "should return 401 unauthorized",
    401,
    async () => {
      await api.functional.redditCommunity.system_notifications.index(
        unauthenticatedConnection,
        {
          body: paginationParams,
        },
      );
    },
  );
}
