import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member with display_name
  const memberConnection: api.IConnection = { host: connection.host };
  const displayName = RandomGenerator.name(1); // 3-30 alphanumeric/underscore/hyphen characters
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      displayName, // Required by scenario to be set
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Retrieve the member profile
  const profile =
    await api.functional.redditCommunity.member.at(memberConnection);
  typia.assert(profile);
  // 3. Validate display_name matches what was set during join
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    displayName,
  );
  // 4. Validate bio is null (not set)
  TestValidator.equals("bio is null", profile.bio, null);
  // 5. Validate avatar_url is null (not set)
  TestValidator.equals("avatar_url is null", profile.avatar_url, null);
  // 6. Validate other required properties
  TestValidator.equals(
    "username matches",
    profile.username,
    joinResponse.username,
  );
  TestValidator.equals("email is null in response", profile.email, null);
  TestValidator.predicate(
    "karma_score is int32",
    profile.karma_score >= -2147483648 && profile.karma_score <= 2147483647,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      profile.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      profile.updated_at,
    ),
  );
}
