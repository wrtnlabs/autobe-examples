import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFeedConfig";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_analytics_statistics_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // Update connection with access token from registration response
  moderatorConnection.headers = {
    Authorization: moderator.access_token,
  };
  // 2. Call the analytics statistics endpoint
  const statistics =
    await api.functional.redditClone.moderator.analytics.statistics.index(
      moderatorConnection,
      {
        body: {},
      },
    );
  // 3. Validate response structure
  typia.assert(statistics);
  // 4. Verify all required metrics categories are present with numeric values
  TestValidator.equals("has users category", !!statistics.data[0]?.users, true);
  TestValidator.equals(
    "has content category",
    !!statistics.data[0]?.content,
    true,
  );
  TestValidator.equals(
    "has communities category",
    !!statistics.data[0]?.communities,
    true,
  );
  TestValidator.equals(
    "has moderation category",
    !!statistics.data[0]?.moderation,
    true,
  );
  TestValidator.equals("has karma category", !!statistics.data[0]?.karma, true);
  // 5. Verify timestamp is present and valid ISO format
  TestValidator.equals(
    "has generated_at",
    !!statistics.data[0]?.generated_at,
    true,
  );
  // 6. Validate specific field types
  const stats = statistics.data[0];
  TestValidator.predicate(
    "users.total is number",
    typeof stats.users.total === "number",
  );
  TestValidator.predicate(
    "content.posts is number",
    typeof stats.content.posts === "number",
  );
  TestValidator.predicate(
    "communities.total is number",
    typeof stats.communities.total === "number",
  );
  TestValidator.predicate(
    "karma.average is number",
    typeof stats.karma.average === "number",
  );
}
