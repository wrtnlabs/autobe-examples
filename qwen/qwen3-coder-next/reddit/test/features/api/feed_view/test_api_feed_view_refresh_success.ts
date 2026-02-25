import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_owner_feed_views_create } from "../../../generate/generate_random_reddit_clone_owner_feed_views_create";
import { prepare_random_reddit_clone_feed_view } from "../../../prepare/prepare_random_reddit_clone_feed_view";

export async function test_api_feed_view_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new owner user with unique credentials
  const ownerConnection: api.IConnection = { host: connection.host };
  const passwordValue: string = "SecurePass123!";
  const joinCredentials: IRedditCloneOwner.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: passwordValue,
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(),
  };
  const registered: IRedditCloneOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {
      body: joinCredentials,
    },
  );
  typia.assert(registered);
  // 2. Login as the owner to obtain authentication tokens
  const loginCredentials: IRedditCloneOwner.ILogin = {
    email: joinCredentials.email,
    href: "http://localhost:3000",
    password: passwordValue,
    referrer: "http://localhost:3000/login",
  };
  const loggedin: IRedditCloneOwner.IAuthorized = await authorize_owner_login(
    ownerConnection,
    {
      body: loginCredentials,
    },
  );
  typia.assert(loggedin);
  // 3. Create a new feed view with valid feed configuration reference
  const feedView: IRedditCloneFeedView =
    await generate_random_reddit_clone_owner_feed_views_create(
      ownerConnection,
      {
        body: {
          cache_key: RandomGenerator.alphabets(10),
          ttl_seconds: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          feed_config_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditCloneFeedView.ICreate,
      },
    );
  typia.assert(feedView);
  // 4. Extract the feedViewId from the created feed view response
  const feedViewId: string = feedView.id;
  // 5. Make PATCH request to refresh the feed view
  const refreshResult: IRedditCloneFeedView.IRefreshResponse =
    await api.functional.redditClone.owner.feed_views.refresh(ownerConnection, {
      feedViewId,
    });
  typia.assert(refreshResult);
  // 6. Verify the response contains success='refreshed' and the correct feedViewId
  TestValidator.equals("success message", refreshResult.success, "refreshed");
  TestValidator.equals(
    "feedViewId matches",
    refreshResult.feedViewId,
    feedViewId,
  );
}
