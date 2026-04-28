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
 * Test profile ownership boundary enforcement preventing cross-user data access.
 *
 * Validates that accessing a profile with mismatched path parameters (memberId from one user and profileId from another user) should return a 404 Not Found error.
 *
 * This test ensures the business rule that a profile's owner must match the memberId in the request path, preventing unauthorized cross-user data access through mismatched path parameters.
 *
 * 1. Register the first member and initialize their profile to obtain a valid profileId belonging to member A.
 * 2. Register a second member to obtain a different valid memberId B.
 * 3. Execute the target GET request using member B's ID paired with the first member's profileId.
 * 4. Validate that the system returns a 404 Not Found error.
 */
export async function test_api_profile_ownership_boundary_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (member A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(memberA);
  // Initialize first member's profile
  const profileA =
    await api.functional.redditLikeCommunity.member.profile.create(
      memberAConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IREdditLikeCommunityProfile.ICreate,
      },
    );
  typia.assert(profileA);
  // 2. Register second member (member B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(memberB);
  // 3 & 4. Attempt to access member A's profile using member B's ID
  // This should fail with 404 Not Found
  await TestValidator.httpError(
    "404 Not Found when accessing profile with mismatched memberId",
    404,
    async () => {
      await api.functional.redditLikeCommunity.members.profiles.at(
        memberBConnection,
        {
          memberId: memberB.id,
          profileId: profileA.id,
        },
      );
    },
  );
}
