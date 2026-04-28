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
 * Test profile inaccessibility after account deletion.
 *
 * Verifies that profiles belonging to deleted member accounts return 404 Not Found
 * errors when accessed by any platform participant, including unauthenticated guests.
 * This enforces the business rule that permanently deleted accounts and their
 * associated content become completely inaccessible to the platform.
 *
 * 1. Register a new member account and authenticate.
 * 2. Create the member's public profile with display name and bio.
 * 3. Retrieve and store the memberId and profileId for later reference.
 * 4. Permanently delete the member account using the profile erase endpoint.
 * 5. Create a new unauthenticated connection (guest).
 * 6. Attempt to retrieve the deleted profile using the original IDs.
 * 7. Validate that a 404 Not Found HTTP error is returned.
 * 8. Confirm the profile is truly inaccessible after account deletion.
 */
export async function test_api_deleted_profile_inaccessibility(
  connection: api.IConnection,
) {
  // 1. Register member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: "test_member",
      href: "https://example.com",
      referrer: "https://example.com/ref",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Create profile for authenticated member
  const profile: IREdditLikeCommunityProfile =
    await generate_random_reddit_like_community_member_profile_create(
      memberConnection,
    );
  typia.assert(profile);
  // 3. Extract IDs before deletion
  const memberId: string & tags.Format<"uuid"> = profile.member.id;
  const profileId: string & tags.Format<"uuid"> = profile.id;
  // 4. Delete the member account (cascades to delete profile)
  await api.functional.redditLikeCommunity.member.profile.erase(
    memberConnection,
  );
  // 5. Create unauthenticated guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 6-7. Attempt to retrieve deleted profile - should fail with 404
  await TestValidator.httpError(
    "deleted profile returns 404 Not Found",
    404,
    async () => {
      await api.functional.redditLikeCommunity.members.profiles.at(
        guestConnection,
        {
          memberId: memberId,
          profileId: profileId,
        },
      );
    },
  );
  // 8. Validation complete - profile is inaccessible after account deletion
}
