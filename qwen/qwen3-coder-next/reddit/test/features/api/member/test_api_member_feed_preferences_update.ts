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

export async function test_api_member_feed_preferences_update(
  connection: api.IConnection,
): Promise<void> {
  // Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // Update feed preferences with all fields
  const feedPreference =
    await api.functional.redditClone.member.feed_preferences.put(
      memberConnection,
      {
        body: {
          default_sort_algorithm: "hot",
          default_time_filter: "today",
          community_specific_enabled: true,
        } satisfies IRedditCloneFeedPreference.IUpdate,
      },
    );
  typia.assert(feedPreference);
  // Validate all fields were set correctly
  TestValidator.equals(
    "default sort algorithm",
    feedPreference.default_sort_algorithm,
    "hot",
  );
  TestValidator.equals(
    "default time filter",
    feedPreference.default_time_filter,
    "today",
  );
  TestValidator.equals(
    "community specific enabled",
    feedPreference.community_specific_enabled,
    true,
  );
}
