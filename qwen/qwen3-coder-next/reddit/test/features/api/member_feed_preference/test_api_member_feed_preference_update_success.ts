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

export async function test_api_member_feed_preference_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Update feed preferences with valid data
  const preference =
    await api.functional.redditClone.member.feed_preferences.patch(
      memberConnection,
      {
        body: {
          default_sort_algorithm: "hot",
          default_time_filter: "this_week",
          community_specific_enabled: true,
        } satisfies IRedditCloneFeedPreferenceOfMember.IUpdate,
      },
    );
  typia.assert(preference);
  // 3. Validate response structure
  typia.assert<IRedditCloneFeedPreferenceOfMember>(preference);
  TestValidator.equals("has valid ID", typeof preference.id, "string");
  TestValidator.equals(
    "has valid feed_preference_id",
    typeof preference.feed_preference_id,
    "string",
  );
  TestValidator.equals(
    "has valid member_id",
    typeof preference.member_id,
    "string",
  );
  TestValidator.equals(
    "created_at is ISO string",
    typeof preference.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is ISO string",
    typeof preference.updated_at,
    "string",
  );
  TestValidator.equals(
    "deleted_at is nullable string",
    typeof preference.deleted_at === "string" || preference.deleted_at === null,
    true,
  );
  TestValidator.equals(
    "member is ISummary",
    preference.member !== undefined,
    true,
  );
}
