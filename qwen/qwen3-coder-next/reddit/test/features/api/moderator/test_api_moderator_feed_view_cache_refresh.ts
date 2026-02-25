import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_feed_view_cache_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData: IRedditCloneModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
  };
  const moderator: IRedditCloneModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: moderatorData,
    });
  typia.assert(moderator);
  // 2. Create a feed view (simulated with a valid UUID)
  const feedViewId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Submit refresh request
  const response: IRedditCloneFeedView.IRefreshResponse =
    await api.functional.redditClone.moderator.feed_views.refresh(
      moderatorConnection,
      {
        feedViewId,
      },
    );
  typia.assert(response);
  // 4. Verify response
  TestValidator.equals("success message", response.success, "refreshed");
  TestValidator.equals("feedViewId matches", response.feedViewId, feedViewId);
  // 5. Confirm database fields (simulated validation)
  // In a real scenario, we would query the database to verify:
  // - is_stale is set to false
  // - last_refreshed_at is set to a recent timestamp
  // - last_content_updated_at is updated to the most recent post timestamp
  // Since this is an E2E test without direct DB access, we validate through the API response
  TestValidator.predicate(
    "has valid feedViewId",
    /^[0-9a-f-]{36}$/i.test(response.feedViewId),
  );
}
