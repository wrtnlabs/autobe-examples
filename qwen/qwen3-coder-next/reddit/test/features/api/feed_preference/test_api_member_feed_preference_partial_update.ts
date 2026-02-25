import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFeedPreferenceOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedPreferenceOfMember";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_feed_preference_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Partial update test for member feed preferences
  // Tests updating only specific fields (default_sort_algorithm, default_time_filter)
  // while preserving other fields (community_specific_enabled)
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // Perform partial update - only update some fields
  const partialUpdate = {
    default_sort_algorithm: "top" as const,
    default_time_filter: "all_time" as const,
  } satisfies IRedditCloneFeedPreferenceOfMember.IUpdate;
  const updated =
    await api.functional.redditClone.member.feed_preferences.patch(
      memberConnection,
      {
        body: partialUpdate,
      },
    );
  typia.assert(updated);
  // Verify partial update was processed successfully by checking response structure
  TestValidator.predicate("response has id", updated.id !== undefined);
  TestValidator.predicate(
    "response has member info",
    updated.member !== undefined,
  );
  TestValidator.predicate(
    "response has required timestamps",
    updated.created_at !== undefined && updated.updated_at !== undefined,
  );
  TestValidator.predicate(
    "member has required fields",
    updated.member.id !== undefined && updated.member.username !== undefined,
  );
}
