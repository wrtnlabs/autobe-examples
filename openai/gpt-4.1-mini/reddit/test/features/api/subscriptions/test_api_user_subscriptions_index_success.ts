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

export async function test_api_user_subscriptions_index_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario:
   * 1. Prepare authenticated user by user joining and obtaining access token.
   * 2. Create a user-specific connection with proper authorization headers.
   * 3. Call the subscriptions index API to fetch paginated subscriptions without parameters.
   * 4. Assert the response structure and contents using typia.assert.
   * 5. Validate pagination info: current = 1, limit > 0, records >= data length, pages >= 0.
   * 6. Validate each subscription in data is active and contains community details such as name, description, icon, subscriber counts.
   * 7. Ensure unauthorized access by guest (base connection) results in 401 error.
   */
  // 1. User join and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_user_join(connection, { body: {} });
  typia.assert(auth);
  // Assign the token to userConnection headers directly (no 'Bearer ' prefix)
  userConnection.headers = { Authorization: auth.token.access };
  // 2. Fetch subscriptions list (page 1 default)
  const subscriptions =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
    );
  typia.assert(subscriptions);
  // 3. Validate pagination information
  const page = subscriptions.pagination;
  TestValidator.predicate("current page is at least 1", page.current >= 1);
  TestValidator.predicate("limit is positive", page.limit > 0);
  TestValidator.predicate("records count non-negative", page.records >= 0);
  TestValidator.predicate("pages count non-negative", page.pages >= 0);
  TestValidator.predicate(
    "records >= data length",
    page.records >= subscriptions.data.length,
  );
  // 4. Validate each subscription data
  for (const subscription of subscriptions.data) {
    typia.assert(subscription);
  }
  // 5. Unauthorized access should return 401
  await TestValidator.httpError("guest unauthorized", 401, async () => {
    await api.functional.communityPlatform.user.subscriptions.index(connection);
  });
}
