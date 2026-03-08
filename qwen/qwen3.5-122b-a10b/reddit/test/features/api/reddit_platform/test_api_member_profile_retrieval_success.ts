import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a member connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Create a new member account through registration
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Retrieve the member's profile using their UUID
  const profile = await api.functional.redditPlatform.members.at(connection, {
    memberId: joinResult.id,
  });
  typia.assert(profile);
  // Step 3: Verify the response contains all public fields
  TestValidator.equals("profile id matches", profile.id, joinResult.id);
  TestValidator.equals(
    "profile username matches",
    profile.username,
    joinResult.username,
  );
  TestValidator.equals(
    "profile display_name matches",
    profile.display_name,
    joinResult.display_name,
  );
  TestValidator.equals("profile bio matches", profile.bio, joinResult.bio);
  TestValidator.equals(
    "profile avatar matches",
    profile.avatar,
    joinResult.avatar,
  );
  TestValidator.equals(
    "profile karma_score matches",
    profile.karma_score,
    joinResult.karma_score,
  );
  TestValidator.equals(
    "profile created_at matches",
    profile.created_at,
    joinResult.created_at,
  );
  TestValidator.equals(
    "profile updated_at matches",
    profile.updated_at,
    joinResult.updated_at,
  );
  // Step 4: Verify sensitive fields (email) are NOT included in the response
  // The IRedditPlatformMember type excludes email - verified by TypeScript compilation
  // We confirm the profile type is IRedditPlatformMember (not IAuthorized)
  TestValidator.equals(
    "profile type is public (no email)",
    typeof (profile as any).email === "undefined",
    true,
  );
  // Step 5: Verify karma_score starts at zero for new accounts
  TestValidator.equals("karma_score is zero", profile.karma_score, 0);
  // Step 6: Verify timestamps are properly formatted as ISO date-time strings
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    !isNaN(Date.parse(profile.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    !isNaN(Date.parse(profile.updated_at)),
  );
}