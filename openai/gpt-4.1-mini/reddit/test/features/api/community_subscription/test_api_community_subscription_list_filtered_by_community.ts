import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test retrieving community subscriptions filtered by communityId for the authenticated user.
 *
 * - Register a new user and authorize.
 * - Call the PATCH /communityPlatform/user/community-subscriptions endpoint with empty body since IRequest is empty.
 * - Validate that the response returns a valid paginated structure and subscription data.
 * - Call again with empty filter to simulate non-existent communityId and validate empty or valid paged response.
 */
export async function test_api_community_subscription_list_filtered_by_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authorize a user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorized.token.access;
  // 2. Call the community subscriptions index endpoint with empty filter
  // because ICommunityPlatformCommunitySubscription.IRequest is empty
  const response: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.user.community_subscriptions.index(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    response.pagination.current > 0 || response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array exists and is an array
  TestValidator.predicate("data array is array", Array.isArray(response.data));
  // 5. Call again with no changes to simulate non-existent communityId results
  const responseEmpty: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.user.community_subscriptions.index(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(responseEmpty);
  // 6. Validate data array exists and is an array for empty case
  TestValidator.predicate(
    "empty data array is array",
    Array.isArray(responseEmpty.data),
  );
}
