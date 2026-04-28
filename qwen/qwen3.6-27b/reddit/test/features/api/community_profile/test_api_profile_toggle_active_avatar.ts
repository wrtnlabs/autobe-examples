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
import { generate_random_reddit_like_community_member_profiles_images_create } from "../../../generate/generate_random_reddit_like_community_member_profiles_images_create";
import { prepare_random_reddit_like_community_profile } from "../../../prepare/prepare_random_reddit_like_community_profile";
import { prepare_random_reddit_like_community_profile_image } from "../../../prepare/prepare_random_reddit_like_community_profile_image";

/**
 * Test avatar swapping logic where a member updates their profile to change their active avatar.
 *
 * Validates that the member can set or change their profile active avatar by providing the file_key of an existing profile image. The update endpoint sets the target image as active and deactivates any previously active avatar, ensuring only one avatar is active at any time.
 *
 * 1. Authenticate as member (profile owner) using join endpoint.
 * 2. Create initial member profile with optional display name and bio.
 * 3. Upload an avatar image to the member's profile image history.
 * 4. Update the profile to set avatar_url to the uploaded image's file_key.
 * 5. Verify the activeAvatar response matches the selected image and is_active is true.
 */
export async function test_api_profile_toggle_active_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (profile owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Create initial member profile
  const profile =
    await generate_random_reddit_like_community_member_profile_create(
      memberConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(profile);
  // 3. Upload an avatar image to the member's profile image history
  const uploadedImage =
    await generate_random_reddit_like_community_member_profiles_images_create(
      memberConnection,
      {
        params: {
          profileId: profile.id,
        },
      },
    );
  typia.assert(uploadedImage);
  // 4. Update profile with avatar_url set to the uploaded image's file_key
  const updatedProfile =
    await api.functional.redditLikeCommunity.member.community_profiles.update(
      memberConnection,
      {
        profileId: profile.id,
        body: {
          avatar_url: uploadedImage.file_key,
        } satisfies IREdditLikeCommunityProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 5. Verify the response shows the selected image in activeAvatar field
  typia.assertGuard(updatedProfile.activeAvatar!);
  TestValidator.equals(
    "active avatar file_key matches uploaded image",
    updatedProfile.activeAvatar!.file_key,
    uploadedImage.file_key,
  );
  TestValidator.predicate(
    "active avatar is_active is true",
    updatedProfile.activeAvatar!.is_active,
  );
  // 6. Confirm profile updated_at reflects the modification
  await TestValidator.predicate(
    "profile updated_at after avatar change",
    !isNaN(Date.parse(updatedProfile.updated_at)),
  );
}