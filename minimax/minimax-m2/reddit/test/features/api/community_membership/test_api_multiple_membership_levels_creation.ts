import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_multiple_membership_levels_creation(
  connection: api.IConnection,
) {
  // Register community creator (will become moderator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `creator_${RandomGenerator.alphabets(8)}`,
        email: creatorEmail,
        password: "SecurePassword123!",
        display_name: "Community Creator",
        bio: "Experienced community moderator and content creator",
        location: "San Francisco, CA",
        href: "https://reddit-platform.test/creator",
        referrer: "https://reddit-platform.test/signup",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(creator);

  // Register subscriber user
  const subscriberEmail = typia.random<string & tags.Format<"email">>();
  const subscriber: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `subscriber_${RandomGenerator.alphabets(8)}`,
        email: subscriberEmail,
        password: "SecurePassword123!",
        display_name: "Casual Reader",
        bio: "Just here to read and learn",
        location: "New York, NY",
        href: "https://reddit-platform.test/subscriber",
        referrer: "https://reddit-platform.test/signup",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(subscriber);

  // Register member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `member_${RandomGenerator.alphabets(8)}`,
        email: memberEmail,
        password: "SecurePassword123!",
        display_name: "Active Contributor",
        bio: "Love to participate in discussions and share knowledge",
        location: "Austin, TX",
        href: "https://reddit-platform.test/member",
        referrer: "https://reddit-platform.test/signup",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(member);

  // Register potential moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const potentialModerator: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `mod_${RandomGenerator.alphabets(8)}`,
        email: moderatorEmail,
        password: "SecurePassword123!",
        display_name: "Trusted Moderator",
        bio: "Experienced moderator with leadership skills",
        location: "Seattle, WA",
        href: "https://reddit-platform.test/moderator",
        referrer: "https://reddit-platform.test/signup",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(potentialModerator);

  // Create test community with creator as initial moderator
  const communityName = `test_community_${RandomGenerator.alphabets(6)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Membership Levels",
          description:
            "A test community to validate different membership levels and permission systems",
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
    "creator is community creator",
    community.creator.id,
    creator.id,
  );

  // Create subscriber membership - basic access with minimal permissions
  const subscriberMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.registeredUser.communities.members.create(
      connection,
      {
        communityName: communityName,
        userId: subscriber.id,
        body: {
          membership_level: "subscriber",
          post_permissions: false,
          comment_permissions: false,
          vote_permissions: false,
        } satisfies IRedditPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(subscriberMembership);

  TestValidator.equals(
    "subscriber membership level",
    subscriberMembership.membership_level,
    "subscriber",
  );
  TestValidator.equals(
    "subscriber no post permissions",
    subscriberMembership.post_permissions,
    false,
  );
  TestValidator.equals(
    "subscriber no comment permissions",
    subscriberMembership.comment_permissions,
    false,
  );
  TestValidator.equals(
    "subscriber no vote permissions",
    subscriberMembership.vote_permissions,
    false,
  );
  TestValidator.equals(
    "subscriber community match",
    subscriberMembership.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscriber user match",
    subscriberMembership.member.id,
    subscriber.id,
  );

  // Create member membership - full participation rights
  const memberMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.registeredUser.communities.members.create(
      connection,
      {
        communityName: communityName,
        userId: member.id,
        body: {
          membership_level: "member",
          post_permissions: true,
          comment_permissions: true,
          vote_permissions: true,
        } satisfies IRedditPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(memberMembership);

  TestValidator.equals(
    "member membership level",
    memberMembership.membership_level,
    "member",
  );
  TestValidator.equals(
    "member has post permissions",
    memberMembership.post_permissions,
    true,
  );
  TestValidator.equals(
    "member has comment permissions",
    memberMembership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "member has vote permissions",
    memberMembership.vote_permissions,
    true,
  );
  TestValidator.equals(
    "member community match",
    memberMembership.community.id,
    community.id,
  );
  TestValidator.equals(
    "member user match",
    memberMembership.member.id,
    member.id,
  );

  // Create moderator membership - highest level with management capabilities
  const moderatorMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.registeredUser.communities.members.create(
      connection,
      {
        communityName: communityName,
        userId: potentialModerator.id,
        body: {
          membership_level: "moderator",
          post_permissions: true,
          comment_permissions: true,
          vote_permissions: true,
        } satisfies IRedditPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(moderatorMembership);

  TestValidator.equals(
    "moderator membership level",
    moderatorMembership.membership_level,
    "moderator",
  );
  TestValidator.equals(
    "moderator has post permissions",
    moderatorMembership.post_permissions,
    true,
  );
  TestValidator.equals(
    "moderator has comment permissions",
    moderatorMembership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "moderator has vote permissions",
    moderatorMembership.vote_permissions,
    true,
  );
  TestValidator.equals(
    "moderator community match",
    moderatorMembership.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator user match",
    moderatorMembership.member.id,
    potentialModerator.id,
  );

  // Test edge case: Create a banned membership (highest restriction)
  const bannedMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.registeredUser.communities.members.create(
      connection,
      {
        communityName: communityName,
        userId: creator.id, // Use creator for this test
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
    "banned membership level",
    bannedMembership.membership_level,
    "banned",
  );
  TestValidator.equals(
    "banned no post permissions",
    bannedMembership.post_permissions,
    false,
  );
  TestValidator.equals(
    "banned no comment permissions",
    bannedMembership.comment_permissions,
    false,
  );
  TestValidator.equals(
    "banned no vote permissions",
    bannedMembership.vote_permissions,
    false,
  );

  // Validate membership hierarchy and data integrity
  TestValidator.notEquals(
    "each membership has unique ID",
    subscriberMembership.id,
    memberMembership.id,
  );
  TestValidator.notEquals(
    "subscriber and moderator IDs differ",
    subscriberMembership.id,
    moderatorMembership.id,
  );
  TestValidator.notEquals(
    "member and moderator IDs differ",
    memberMembership.id,
    moderatorMembership.id,
  );

  // Verify all memberships reference the same community
  TestValidator.equals(
    "subscriber community name",
    subscriberMembership.community.name,
    communityName,
  );
  TestValidator.equals(
    "member community name",
    memberMembership.community.name,
    communityName,
  );
  TestValidator.equals(
    "moderator community name",
    moderatorMembership.community.name,
    communityName,
  );

  // Verify all memberships have proper timestamps
  TestValidator.predicate(
    "subscriber has join timestamp",
    subscriberMembership.joined_at.length > 0,
  );
  TestValidator.predicate(
    "member has join timestamp",
    memberMembership.joined_at.length > 0,
  );
  TestValidator.predicate(
    "moderator has join timestamp",
    moderatorMembership.joined_at.length > 0,
  );

  // Test timestamp ordering (should be sequential)
  const subscriberTime = new Date(subscriberMembership.joined_at).getTime();
  const memberTime = new Date(memberMembership.joined_at).getTime();
  const moderatorTime = new Date(moderatorMembership.joined_at).getTime();

  TestValidator.predicate(
    "membership timestamps are sequential",
    subscriberTime <= memberTime && memberTime <= moderatorTime,
  );

  console.log("✅ All membership level tests passed successfully!");
  console.log(`Created community: ${communityName}`);
  console.log(
    `Subscriber: ${subscriber.username} (permissions: ${subscriberMembership.post_permissions}, ${subscriberMembership.comment_permissions}, ${subscriberMembership.vote_permissions})`,
  );
  console.log(
    `Member: ${member.username} (permissions: ${memberMembership.post_permissions}, ${memberMembership.comment_permissions}, ${memberMembership.vote_permissions})`,
  );
  console.log(
    `Moderator: ${potentialModerator.username} (permissions: ${moderatorMembership.post_permissions}, ${moderatorMembership.comment_permissions}, ${moderatorMembership.vote_permissions})`,
  );
}
