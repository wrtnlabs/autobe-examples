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

export async function test_api_member_feed_preferences_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IRedditCloneMember.IJoin>,
  });
  typia.assert(member);
  // 2. Set initial feed preferences
  const initialPreferences = {
    default_sort_algorithm: "hot",
    default_time_filter: "today",
    community_specific_enabled: true,
  } satisfies IRedditCloneFeedPreference.IUpdate;
  const initialOutput =
    await api.functional.redditClone.member.feed_preferences.put(
      memberConnection,
      { body: initialPreferences },
    );
  typia.assert(initialOutput);
  // 3. Validate initial preferences
  TestValidator.equals(
    "initial sort algorithm is hot",
    initialOutput.default_sort_algorithm,
    "hot",
  );
  TestValidator.equals(
    "initial time filter is today",
    initialOutput.default_time_filter,
    "today",
  );
  TestValidator.equals(
    "initial community specific enabled is true",
    initialOutput.community_specific_enabled,
    true,
  );
  // 4. Partial update - change only default_sort_algorithm to 'new'
  const partialUpdate = {
    default_sort_algorithm: "new",
  } satisfies IRedditCloneFeedPreference.IUpdate;
  const updatedOutput =
    await api.functional.redditClone.member.feed_preferences.put(
      memberConnection,
      { body: partialUpdate },
    );
  typia.assert(updatedOutput);
  // 5. Validate partial update - only modified field changes, others preserved
  TestValidator.equals(
    "updated sort algorithm is new",
    updatedOutput.default_sort_algorithm,
    "new",
  );
  TestValidator.equals(
    "time filter preserved as today",
    updatedOutput.default_time_filter,
    "today",
  );
  TestValidator.equals(
    "community specific enabled preserved as true",
    updatedOutput.community_specific_enabled,
    true,
  );
}
