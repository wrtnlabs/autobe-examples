import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_profile_create } from "../../../generate/generate_random_reddit_like_community_member_profile_create";
import { prepare_random_reddit_like_community_profile } from "../../../prepare/prepare_random_reddit_like_community_profile";
import { prepare_random_reddit_like_community_profile_image } from "../../../prepare/prepare_random_reddit_like_community_profile_image";

/**
 * Validate retrieving a member's full details after they have initialized their public profile.
 *
 * Tests that member lookup correctly aggregates authentication identity (username, email) with public profile data (display_name, bio, karma) via the member-to-profile JOIN. Verifies that explicitly set profile fields are returned correctly and that aggregate fields like karma have sensible defaults for new members.
 *
 * 1. Member registers with email, password, and unique username.
 * 2. Member initializes their public profile with a display name and bio text.
 * 3. Retrieve member by ID using the members lookup endpoint.
 * 4. Assert response type and validate combined identity and profile fields.
 */
export async function test_api_member_retrieval_with_profile_data(
  connection: api.IConnection,
): Promise<void> {
  const displayName = RandomGenerator.name();
  const bioText = RandomGenerator.paragraph({ sentences: 2 });
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorized);
  const profile =
    await generate_random_reddit_like_community_member_profile_create(
      memberConnection,
      {
        body: {
          display_name: displayName,
          bio: bioText,
        },
      },
    );
  typia.assert(profile);
  const member = await api.functional.redditLikeCommunity.members.at(
    memberConnection,
    {
      memberId: authorized.id,
    },
  );
  typia.assert(member);
  TestValidator.equals("member id matches", member.id, authorized.id);
  TestValidator.equals(
    "username matches",
    member.username,
    authorized.username,
  );
  TestValidator.equals("email matches", member.email, authorized.email);
  TestValidator.equals(
    "display name set correctly",
    member.display_name,
    displayName,
  );
  TestValidator.equals("bio set correctly", member.bio, bioText);
  TestValidator.equals("karma is default zero for new member", member.karma, 0);
  TestValidator.predicate("account is not deleted", member.deleted_at === null);
}
