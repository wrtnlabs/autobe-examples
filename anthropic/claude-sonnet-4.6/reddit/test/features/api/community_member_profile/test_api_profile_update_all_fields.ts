import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Step 2: Prepare profile update body with all three optional fields
  const displayName = "Test User";
  const bio = "Hello, I love this community!";
  const avatarUrl = typia.random<string & tags.Format<"uri">>();
  const body = {
    display_name: displayName,
    bio: bio,
    avatar_url: avatarUrl,
  } satisfies ICommunityUserProfile.IUpdate;
  // Step 3: Call PUT /community/member/profile with the member's authenticated connection
  const profile = await api.functional.community.member.profile.update(
    memberConnection,
    { body },
  );
  // Step 4: Validate full type
  typia.assert(profile);
  // Step 5: Validate business logic
  TestValidator.equals(
    "displayName matches submitted value",
    profile.displayName,
    displayName,
  );
  TestValidator.equals("bio matches submitted value", profile.bio, bio);
  TestValidator.equals(
    "avatarUrl matches submitted value",
    profile.avatarUrl,
    avatarUrl,
  );
  TestValidator.equals("karmaScore is 0", profile.karmaScore, 0);
  TestValidator.equals(
    "communityMemberId matches member id",
    profile.communityMemberId,
    authorized.id,
  );
  // Step 6: Validate nested member summary reflects updated fields
  TestValidator.equals(
    "member summary display_name reflects update",
    profile.member.display_name,
    displayName,
  );
  TestValidator.equals(
    "member summary avatar_url reflects update",
    profile.member.avatar_url,
    avatarUrl,
  );
}
