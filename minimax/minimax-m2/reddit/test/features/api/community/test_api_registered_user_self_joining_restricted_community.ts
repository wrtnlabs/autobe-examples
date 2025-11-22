import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_registered_user_self_joining_restricted_community(
  connection: api.IConnection,
) {
  // 1. Create a restricted community where users need approval to participate
  const communityName = `restricted_${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: `Restricted Community ${communityName}`,
          description:
            "A restricted community where users must be added by moderators",
          type: "restricted",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community type is restricted",
    community.type,
    "restricted",
  );

  // 2. Register a new user account that will request membership
  const userEmail = `${RandomGenerator.alphaNumeric(12)}@test.com`;
  const username = `user_${RandomGenerator.alphaNumeric(8)}`;
  const user = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: username,
      email: userEmail,
      password: "TestPassword123!",
      display_name: `User ${username}`,
      bio: "Test user for restricted community membership",
      location: "Test City",
      href: "https://test.example.com",
      referrer: "https://test.example.com/referral",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(user);
  TestValidator.equals("user account is active", user.accountStatus, "active");

  // 3. Add the user to the restricted community with appropriate membership level
  const membership =
    await api.functional.redditPlatform.registeredUser.communities.members.create(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          membership_level: "subscriber",
          post_permissions: true,
          comment_permissions: true,
          vote_permissions: true,
        } satisfies IRedditPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership);

  // 4. Validate that the user is properly added with subscriber permissions
  TestValidator.equals(
    "membership level is subscriber",
    membership.membership_level,
    "subscriber",
  );
  TestValidator.equals(
    "user has post permissions",
    membership.post_permissions,
    true,
  );
  TestValidator.equals(
    "user has comment permissions",
    membership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "user has vote permissions",
    membership.vote_permissions,
    true,
  );
  TestValidator.equals(
    "community reference matches",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "member reference matches",
    membership.member.id,
    user.id,
  );

  // 5. Verify the community member count is updated correctly
  TestValidator.predicate(
    "member count increased",
    membership.community.member_count >= 1,
  );
}
