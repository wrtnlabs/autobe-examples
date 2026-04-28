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
 * Tests profile update workflow for a member's display name and bio.
 *
 * Validates that an authenticated member can successfully update their public profile with new
 * display name and biographical text. Ensures the response contains the fully updated
 * profile entity with refreshed timestamps while maintaining integrity of other fields.
 *
 * 1. Authenticates a new member via the join endpoint.
 * 2. Creates an initial profile with a display name and bio.
 * 3. Updates the profile with different display name and bio values.
 * 4. Validates the display_name field reflects the newly provided value.
 * 5. Validates the bio field reflects the newly provided value.
 * 6. Ensures the updated_at timestamp was refreshed from the initial value.
 * 7. Verifies the karma score remains exactly unchanged from creation.
 * 8. Confirms the profile ID remains unchanged.
 * 9. Confirms the member reference remains unchanged.
 */
export async function test_api_profile_update_display_name_and_bio(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const body: IREdditLikeCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const authorization: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, { body });
  // 2. Create initial profile with initial display name and bio
  const initialDisplayName: string | null = RandomGenerator.name();
  const initialBio: string | null = RandomGenerator.paragraph({ sentences: 2 });
  const initialProfile: IREdditLikeCommunityProfile =
    await generate_random_reddit_like_community_member_profile_create(
      memberConnection,
      {
        body: {
          display_name: initialDisplayName,
          bio: initialBio,
        } satisfies DeepPartial<IREdditLikeCommunityProfile.ICreate>,
      },
    );
  // 3. Capture initial state
  const initialKarma: number & tags.Type<"int32"> = initialProfile.karma;
  // 4. Prepare update body with new values
  const newDisplayName: string = RandomGenerator.name();
  const newBio: string = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody: IREdditLikeCommunityProfile.IUpdate = {
    display_name: newDisplayName,
    bio: newBio,
  };
  // 5. Update profile with new display name and bio
  const updatedProfile: IREdditLikeCommunityProfile =
    await api.functional.redditLikeCommunity.member.community_profiles.update(
      memberConnection,
      {
        profileId: initialProfile.id,
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 6. Validate display_name was updated to the new value
  TestValidator.equals(
    "display name matches update",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 7. Validate bio was updated to the new value
  TestValidator.equals("bio matches update", updatedProfile.bio, newBio);
  // 8. Ensure updated_at timestamp was refreshed
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    updatedProfile.updated_at,
    initialProfile.updated_at,
  );
  // 9. Verify karma score remains unchanged
  TestValidator.equals(
    "karma remains unchanged",
    updatedProfile.karma,
    initialKarma,
  );
  // 10. Verify profile ID remains unchanged
  TestValidator.equals(
    "profile ID unchanged",
    updatedProfile.id,
    initialProfile.id,
  );
  // 11. Verify member reference remains unchanged
  TestValidator.equals(
    "member identity unchanged",
    updatedProfile.member.id,
    initialProfile.member.id,
  );
}
