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

export async function test_api_user_subscriptions_index_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Authenticated user with no subscriptions should see empty paginated list
  // Create a user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(connection, { body: {} });
  typia.assert(authorized);
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Call the subscriptions index endpoint
  const subscriptions =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
    );
  typia.assert(subscriptions);
  // Validate empty subscription list
  TestValidator.equals(
    "subscriptions data is empty",
    subscriptions.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination records count is zero",
    subscriptions.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination pages count is zero",
    subscriptions.pagination.pages === 0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    subscriptions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is numeric and > 0",
    subscriptions.pagination.limit > 0,
  );
  // Validate unauthenticated access fails with 401 Unauthorized
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("guest unauthorized access", 401, async () => {
    await api.functional.communityPlatform.user.subscriptions.index(
      guestConnection,
    );
  });
}
