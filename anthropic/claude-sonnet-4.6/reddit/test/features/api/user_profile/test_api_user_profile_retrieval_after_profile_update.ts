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

export async function test_api_user_profile_retrieval_after_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member using the utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Step 2: Prepare profile update data
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const avatarUrl = typia.random<string & tags.Format<"uri">>();
  // Step 3: Update the member's profile (using authenticated memberConnection)
  const updatedProfile = await api.functional.community.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: displayName,
        bio: bio,
        avatar_url: avatarUrl,
      } satisfies ICommunityUserProfile.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // Step 4: Retrieve the profile via the public endpoint (no auth required)
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedProfile = await api.functional.community.userProfiles.at(
    publicConnection,
    {
      userProfileId: updatedProfile.id,
    },
  );
  typia.assert(retrievedProfile);
  // Step 5: Validate the retrieved profile reflects updated values
  TestValidator.equals(
    "displayName matches update",
    retrievedProfile.displayName,
    displayName,
  );
  TestValidator.equals("bio matches update", retrievedProfile.bio, bio);
  TestValidator.equals(
    "avatarUrl matches update",
    retrievedProfile.avatarUrl,
    avatarUrl,
  );
  TestValidator.equals("karmaScore is 0", retrievedProfile.karmaScore, 0);
  // Validate updatedAt >= createdAt
  TestValidator.predicate(
    "updatedAt is not earlier than createdAt",
    new Date(retrievedProfile.updatedAt).getTime() >=
      new Date(retrievedProfile.createdAt).getTime(),
  );
  // Validate nested member summary reflects updated display name and avatar
  TestValidator.equals(
    "member summary display_name matches",
    retrievedProfile.member.display_name,
    displayName,
  );
  TestValidator.equals(
    "member summary avatar_url matches",
    retrievedProfile.member.avatar_url,
    avatarUrl,
  );
  TestValidator.equals(
    "member communityMemberId matches authorized id",
    retrievedProfile.communityMemberId,
    authorized.id,
  );
}
