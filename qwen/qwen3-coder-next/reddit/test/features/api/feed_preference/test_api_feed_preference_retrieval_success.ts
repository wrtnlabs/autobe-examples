import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedPreference";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_feed_preference_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and log in as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: "testuser_" + RandomGenerator.alphaNumeric(8),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a new connection with the authenticated token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: "Bearer " + member.token.access,
    },
  };
  // 3. Send GET request to /redditClone/member/feed-preferences
  const feedPreference: IRedditCloneFeedPreference =
    await api.functional.redditClone.member.feed_preferences.at(
      authenticatedConnection,
    );
  typia.assert(feedPreference);
  // 4. Validate response contains the expected feed preference structure
  // default_sort_algorithm should be one of: hot, new, top, controversial
  TestValidator.predicate(
    "default_sort_algorithm is valid",
    ["hot", "new", "top", "controversial"].includes(
      feedPreference.default_sort_algorithm,
    ),
  );
  // default_time_filter should be null or one of: today, this_week, this_month, this_year, all_time
  TestValidator.predicate(
    "default_time_filter is valid or null",
    feedPreference.default_time_filter === null ||
      ["today", "this_week", "this_month", "this_year", "all_time"].includes(
        feedPreference.default_time_filter,
      ),
  );
  // community_specific_enabled should be boolean
  TestValidator.predicate(
    "community_specific_enabled is boolean",
    typeof feedPreference.community_specific_enabled === "boolean",
  );
  // 5. Verify the response matches the IRedditCloneFeedPreference schema structure
  // All required fields are present and have correct types
  TestValidator.equals(
    "feed preference has all required fields",
    true,
    feedPreference.default_sort_algorithm !== undefined &&
      feedPreference.default_time_filter !== undefined &&
      feedPreference.community_specific_enabled !== undefined,
  );
}
