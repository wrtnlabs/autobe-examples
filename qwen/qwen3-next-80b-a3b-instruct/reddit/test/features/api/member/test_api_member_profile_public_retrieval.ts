import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_profile_public_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create a new unauthenticated connection for public profile retrieval
  const publicConnection: api.IConnection = { host: connection.host };
  // Step 3: Retrieve the member's public profile using the member_id
  const profile: ICommunityPlatformMember =
    await api.functional.communityPlatform.member.members.at(publicConnection, {
      memberId: member.member_id,
    });
  typia.assert(profile);
  // Step 4: Validate public profile contains expected fields
  TestValidator.equals(
    "member_id matches",
    profile.member_id,
    member.member_id,
  );
  TestValidator.equals("username matches", profile.username, member.username);
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    member.display_name,
  );
  TestValidator.predicate("bio is optional and matches if present", () => {
    if (profile.bio === undefined) return true;
    return profile.bio === member.bio;
  });
  TestValidator.predicate(
    "avatar_url is optional and matches if present",
    () => {
      if (profile.avatar_url === undefined) return true;
      return profile.avatar_url === member.avatar_url;
    },
  );
  TestValidator.equals("karma matches", profile.karma, member.karma);
}
