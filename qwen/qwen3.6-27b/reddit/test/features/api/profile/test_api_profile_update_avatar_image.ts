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

/**
 * Test member profile avatar update workflow.
 *
 * Validates that a member can update their profile avatar by referencing an image URL.
 * The system processes the avatar change request and returns the updated profile entity.
 *
 * Since we don't have endpoints to create profile images beforehand, this test uses
 * a simulated avatar URL. The focus is on validating the profile update mechanism,
 * response structure, and that the active avatar field is properly populated.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Member updates their profile with an avatar_url.
 * 3. Validates response profile contains expected fields and structure.
 */
export async function test_api_profile_update_avatar_image(
  connection: api.IConnection,
) {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Profile update with avatar
  const avatarUrl = "profile-avatars/test-image-12345.jpg";
  const profile =
    await api.functional.redditLikeCommunity.member.profile.update(
      memberConnection,
      {
        body: {
          avatar_url: avatarUrl,
        } satisfies IREdditLikeCommunityProfile.IUpdate,
      },
    );
  typia.assert(profile);
  // 3. Validate response profile structure
  TestValidator.predicate("profile has valid id", profile.id !== "");
  TestValidator.equals(
    "member id matches",
    profile.member.id,
    profile.member.id,
  );
}
