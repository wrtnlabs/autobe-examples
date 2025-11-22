import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Validate that registered users can successfully join public communities.
 *
 * This test verifies the complete community joining workflow for public
 * communities, where authenticated users can self-join without moderator
 * approval. The test creates a new registered user account and then joins a
 * public community, validating that a proper membership record is created with
 * 'subscriber' level access rights.
 *
 * The workflow includes:
 *
 * 1. Creating a new registered user with valid credentials
 * 2. Joining a public community using the community name
 * 3. Validating the membership record structure and permissions
 *
 * This test ensures that public community access works correctly for new users
 * and that membership records are properly created with appropriate default
 * permissions.
 */
export async function test_api_community_joining_public_community(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account for community joining test
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const username = RandomGenerator.alphabets(8);

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: username,
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        location: RandomGenerator.paragraph({ sentences: 1 }),
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Validate user account creation
  TestValidator.equals(
    "user account created successfully",
    user.username,
    username,
  );
  TestValidator.equals("user email matches", user.email, userEmail);
  TestValidator.predicate(
    "user has valid authentication token",
    !!user.token.access,
  );
  TestValidator.equals(
    "account status is active",
    user.accountStatus,
    "active",
  );

  // Step 2: Join a public community
  // Using a well-known public community name for testing
  const communityName = "technology";

  const membership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.join(connection, {
      communityName: communityName,
    });
  typia.assert(membership);

  // Step 3: Validate membership record structure and data
  TestValidator.equals(
    "membership level is subscriber",
    membership.membership_level,
    "subscriber",
  );
  TestValidator.equals(
    "user ID matches",
    membership.registered_user_id,
    user.id,
  );
  TestValidator.equals(
    "community name matches",
    membership.community.name,
    communityName,
  );
  TestValidator.predicate(
    "joined timestamp is present",
    !!membership.joined_at,
  );
  TestValidator.predicate(
    "post permissions enabled",
    membership.post_permissions,
  );
  TestValidator.predicate(
    "comment permissions enabled",
    membership.comment_permissions,
  );
  TestValidator.predicate(
    "vote permissions enabled",
    membership.vote_permissions,
  );

  // Validate community information in membership
  TestValidator.equals(
    "community type is public",
    membership.community.type,
    "public",
  );
  TestValidator.equals(
    "community status is active",
    membership.community.status,
    "active",
  );
  TestValidator.predicate("community has valid ID", !!membership.community.id);
  TestValidator.predicate(
    "community has member count",
    typeof membership.community.member_count === "number",
  );

  // Validate member information in membership
  TestValidator.equals(
    "member username matches",
    membership.member.username,
    username,
  );
  TestValidator.equals(
    "member display name matches",
    membership.member.display_name,
    user.displayName,
  );
  TestValidator.equals(
    "member account status",
    membership.member.account_status,
    "active",
  );
  TestValidator.predicate(
    "member has valid karma score",
    typeof membership.member.karma_score === "number",
  );
}
