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

export async function test_api_community_subscription_list_retrieval_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authorize user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Call the index endpoint with empty filter
  const output =
    await api.functional.communityPlatform.user.community_subscriptions.index(
      userConnection,
      {
        body: {} satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  // 3. Assert the response type
  typia.assert(output);
  // 4. Validate pagination metadata is present and reasonable
  const pagination = output.pagination;
  TestValidator.predicate(
    "current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  // 5. Validate each subscription record
  for (const subscription of output.data) {
    typia.assert(subscription);
    // Check that deleted_at is null or undefined or not present to ensure no soft-deleted record
    if ("deleted_at" in subscription) {
      TestValidator.predicate(
        "subscription is not soft-deleted",
        subscription.deleted_at === null ||
          subscription.deleted_at === undefined,
      );
    }
  }
}
