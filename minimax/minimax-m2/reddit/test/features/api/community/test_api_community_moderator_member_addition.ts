import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_moderator_member_addition(
  connection: api.IConnection,
) {
  // Step 1: Register the moderator user (initial community creator)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
        email: moderatorEmail,
        password: "SecurePassword123!",
        display_name: "Community Moderator",
        bio: "I moderate communities",
        location: "Test City",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://test.example.com",
        referrer: "https://test.example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator account created",
    moderator.accountStatus,
    "active",
  );

  // Step 2: Register additional users to be added as members
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `member1_${RandomGenerator.alphaNumeric(8)}`,
        email: member1Email,
        password: "SecurePassword123!",
        display_name: "Community Member 1",
        bio: "I like to participate in communities",
        location: "Test City",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://test.example.com",
        referrer: "https://test.example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(member1);
  TestValidator.equals(
    "member1 account created",
    member1.accountStatus,
    "active",
  );

  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `member2_${RandomGenerator.alphaNumeric(8)}`,
        email: member2Email,
        password: "SecurePassword123!",
        display_name: "Community Member 2",
        bio: "I'm new to this platform",
        location: "Test City",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://test.example.com",
        referrer: "https://test.example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(member2);
  TestValidator.equals(
    "member2 account created",
    member2.accountStatus,
    "active",
  );

  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `member3_${RandomGenerator.alphaNumeric(8)}`,
        email: member3Email,
        password: "SecurePassword123!",
        display_name: "Community Member 3",
        bio: "I enjoy engaging with content",
        location: "Test City",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://test.example.com",
        referrer: "https://test.example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(member3);
  TestValidator.equals(
    "member3 account created",
    member3.accountStatus,
    "active",
  );

  // Step 3: Create a test community (moderator becomes initial moderator)
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Member Addition",
          description:
            "A test community for validating moderator member addition functionality",
          type: "public",
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
    "community created successfully",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "creator is moderator",
    community.creator.username,
    moderator.username,
  );
  TestValidator.equals("community is public", community.type, "public");
  TestValidator.equals("community is active", community.status, "active");

  // Step 4: Add member1 as a regular member with full permissions
  const membership1: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.registeredUser.communities.members.create(
      connection,
      {
        communityName: community.name,
        userId: member1.id,
        body: {
          membership_level: "member",
          post_permissions: true,
          comment_permissions: true,
          vote_permissions: true,
        } satisfies IRedditPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership1);
  TestValidator.equals(
    "member1 membership level",
    membership1.membership_level,
    "member",
  );
  TestValidator.equals(
    "member1 post permissions",
    membership1.post_permissions,
    true,
  );
  TestValidator.equals(
    "member1 comment permissions",
    membership1.comment_permissions,
    true,
  );
  TestValidator.equals(
    "member1 vote permissions",
    membership1.vote_permissions,
    true,
  );
  TestValidator.equals(
    "member1 community matches",
    membership1.community.name,
    community.name,
  );
  TestValidator.equals(
    "member1 user matches",
    membership1.member.username,
    member1.username,
  );

  // Step 5: Add member2 as a subscriber with limited permissions
  const membership2: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.registeredUser.communities.members.create(
      connection,
      {
        communityName: community.name,
        userId: member2.id,
        body: {
          membership_level: "subscriber",
          post_permissions: false,
          comment_permissions: false,
          vote_permissions: true,
        } satisfies IRedditPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership2);
  TestValidator.equals(
    "member2 membership level",
    membership2.membership_level,
    "subscriber",
  );
  TestValidator.equals(
    "member2 post permissions",
    membership2.post_permissions,
    false,
  );
  TestValidator.equals(
    "member2 comment permissions",
    membership2.comment_permissions,
    false,
  );
  TestValidator.equals(
    "member2 vote permissions",
    membership2.vote_permissions,
    true,
  );
  TestValidator.equals(
    "member2 community matches",
    membership2.community.name,
    community.name,
  );
  TestValidator.equals(
    "member2 user matches",
    membership2.member.username,
    member2.username,
  );

  // Step 6: Add member3 as a moderator with all permissions
  const membership3: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.registeredUser.communities.members.create(
      connection,
      {
        communityName: community.name,
        userId: member3.id,
        body: {
          membership_level: "moderator",
          post_permissions: true,
          comment_permissions: true,
          vote_permissions: true,
        } satisfies IRedditPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership3);
  TestValidator.equals(
    "member3 membership level",
    membership3.membership_level,
    "moderator",
  );
  TestValidator.equals(
    "member3 post permissions",
    membership3.post_permissions,
    true,
  );
  TestValidator.equals(
    "member3 comment permissions",
    membership3.comment_permissions,
    true,
  );
  TestValidator.equals(
    "member3 vote permissions",
    membership3.vote_permissions,
    true,
  );
  TestValidator.equals(
    "member3 community matches",
    membership3.community.name,
    community.name,
  );
  TestValidator.equals(
    "member3 user matches",
    membership3.member.username,
    member3.username,
  );

  // Step 7: Test edge case - attempting to add the same member again should fail
  await TestValidator.error("duplicate membership should fail", async () => {
    await api.functional.redditPlatform.registeredUser.communities.members.create(
      connection,
      {
        communityName: community.name,
        userId: member1.id,
        body: {
          membership_level: "member",
          post_permissions: true,
          comment_permissions: true,
          vote_permissions: true,
        } satisfies IRedditPlatformCommunityMembership.ICreate,
      },
    );
  });

  // Step 8: Test edge case - attempting to add a non-existent user
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "adding non-existent user should fail",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.members.create(
        connection,
        {
          communityName: community.name,
          userId: nonExistentUserId,
          body: {
            membership_level: "member",
            post_permissions: true,
            comment_permissions: true,
            vote_permissions: true,
          } satisfies IRedditPlatformCommunityMembership.ICreate,
        },
      );
    },
  );

  // Step 9: Test edge case - attempting to add to a non-existent community
  const nonExistentCommunity = `non_existent_${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.error(
    "adding to non-existent community should fail",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.members.create(
        connection,
        {
          communityName: nonExistentCommunity,
          userId: member1.id,
          body: {
            membership_level: "member",
            post_permissions: true,
            comment_permissions: true,
            vote_permissions: true,
          } satisfies IRedditPlatformCommunityMembership.ICreate,
        },
      );
    },
  );

  // Step 10: Verify that all memberships have proper timestamps
  TestValidator.predicate(
    "member1 has join timestamp",
    membership1.joined_at !== null && membership1.joined_at !== undefined,
  );
  TestValidator.predicate(
    "member2 has join timestamp",
    membership2.joined_at !== null && membership2.joined_at !== undefined,
  );
  TestValidator.predicate(
    "member3 has join timestamp",
    membership3.joined_at !== null && membership3.joined_at !== undefined,
  );

  // Step 11: Verify community member counts are updated
  TestValidator.predicate(
    "community member count updated",
    community.member_count >= 1,
  );

  // Step 12: Test with banned membership level
  const member4Email = typia.random<string & tags.Format<"email">>();
  const member4: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `member4_${RandomGenerator.alphaNumeric(8)}`,
        email: member4Email,
        password: "SecurePassword123!",
        display_name: "Community Member 4",
        bio: "I might get banned",
        location: "Test City",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://test.example.com",
        referrer: "https://test.example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(member4);

  const bannedMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.registeredUser.communities.members.create(
      connection,
      {
        communityName: community.name,
        userId: member4.id,
        body: {
          membership_level: "banned",
          post_permissions: false,
          comment_permissions: false,
          vote_permissions: false,
        } satisfies IRedditPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(bannedMembership);
  TestValidator.equals(
    "banned member has no permissions",
    bannedMembership.membership_level,
    "banned",
  );
  TestValidator.equals(
    "banned member post permissions",
    bannedMembership.post_permissions,
    false,
  );
  TestValidator.equals(
    "banned member comment permissions",
    bannedMembership.comment_permissions,
    false,
  );
  TestValidator.equals(
    "banned member vote permissions",
    bannedMembership.vote_permissions,
    false,
  );
}
