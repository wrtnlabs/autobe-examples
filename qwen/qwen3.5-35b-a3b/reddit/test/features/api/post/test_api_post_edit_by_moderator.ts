import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test community moderators can edit posts created by other members in their community.
 *
 * This test validates the moderator post editing authorization flow:
 * 1. Community owner creates a community
 * 2. Second member joins, subscribes to community, creates a post
 * 3. Third member is appointed as moderator
 * 4. Moderator successfully edits the second member's post
 * 5. Verify post fields are updated correctly while preserving other data
 */
export async function test_api_post_edit_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Community owner
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      username: ownerUsername,
      password: ownerPassword,
      href: typia.random<string & tags.Format<"uri">>() as string,
      referrer: typia.random<string & tags.Format<"uri">>() as string,
    },
  });
  const ownerConnection2: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_login(ownerConnection2, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    },
  });
  typia.assert(ownerAuthorized);
  // Owner creates community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection2,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 2. Setup: Second member (post author)
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const secondPassword = RandomGenerator.alphaNumeric(16);
  const secondConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondConnection, {
    body: {
      email: secondEmail,
      username: secondUsername,
      password: secondPassword,
      href: typia.random<string & tags.Format<"uri">>() as string,
      referrer: typia.random<string & tags.Format<"uri">>() as string,
    },
  });
  const secondConnection2: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_member_login(secondConnection2, {
    body: {
      email: secondEmail,
      password: secondPassword,
    },
  });
  typia.assert(secondAuthorized);
  const secondMemberId = secondAuthorized.id;
  // Second member subscribes to community
  await api.functional.redditPlatform.member.communities.subscribe(
    secondConnection2,
    {
      communityId: community.id,
      body: { confirmSubscription: true },
    },
  );
  // 3. Setup: Third member (moderator)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>() as string,
      referrer: typia.random<string & tags.Format<"uri">>() as string,
    },
  });
  const moderatorConnection2: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_member_login(
    moderatorConnection2,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      },
    },
  );
  typia.assert(moderatorAuthorized);
  const moderatorMemberId = moderatorAuthorized.id;
  // Owner adds third member as moderator
  await api.functional.redditPlatform.member.communities.moderators.add(
    ownerConnection2,
    {
      communityId: community.id,
      body: {
        user_id: moderatorMemberId,
      },
    },
  );
  // 4. Test: Moderator edits a TEXT post created by second member
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const originalContent = RandomGenerator.content({ paragraphs: 2 });
  const textPost = await api.functional.redditPlatform.member.posts.create(
    secondConnection2,
    {
      body: {
        title: originalTitle,
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: originalContent,
      },
    },
  );
  typia.assert(textPost);
  const originalCreatedAt = textPost.createdAt;
  const originalVoteScore = textPost.voteScore;
  const originalCommentCount = textPost.commentCount;
  const newTextTitle = RandomGenerator.paragraph({ sentences: 4 });
  const newTextContent = RandomGenerator.content({ paragraphs: 3 });
  const editedTextPost =
    await api.functional.redditPlatform.member.posts.update(
      moderatorConnection2,
      {
        postId: textPost.id,
        body: {
          title: newTextTitle,
          content: newTextContent,
        },
      },
    );
  typia.assert(editedTextPost);
  // Verify TEXT post edit
  TestValidator.equals(
    "text post title updated",
    editedTextPost.title,
    newTextTitle,
  );
  TestValidator.equals(
    "text post content updated",
    editedTextPost.content,
    newTextContent,
  );
  TestValidator.equals(
    "text post type unchanged",
    editedTextPost.postType,
    "TEXT",
  );
  TestValidator.equals(
    "text post vote score unchanged",
    editedTextPost.voteScore,
    originalVoteScore,
  );
  TestValidator.equals(
    "text post comment count unchanged",
    editedTextPost.commentCount,
    originalCommentCount,
  );
  TestValidator.equals(
    "text post author unchanged",
    editedTextPost.author.id,
    secondMemberId,
  );
  TestValidator.equals(
    "text post community unchanged",
    editedTextPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "text post created_at unchanged",
    editedTextPost.createdAt,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "text post updated_at refreshed",
    editedTextPost.updatedAt,
    originalCreatedAt,
  );
  // 5. Test: Moderator edits a LINK post
  const originalLinkTitle = RandomGenerator.name(3);
  const originalLinkUrl = typia.random<string & tags.Format<"uri">>() as string;
  const linkPost = await api.functional.redditPlatform.member.posts.create(
    secondConnection2,
    {
      body: {
        title: originalLinkTitle,
        postType: "LINK",
        redditPlatformCommunityId: community.id,
        url: originalLinkUrl,
      },
    },
  );
  typia.assert(linkPost);
  const newLinkTitle = RandomGenerator.name(4);
  const newLinkUrl = typia.random<string & tags.Format<"uri">>() as string;
  const editedLinkPost =
    await api.functional.redditPlatform.member.posts.update(
      moderatorConnection2,
      {
        postId: linkPost.id,
        body: {
          title: newLinkTitle,
          url: newLinkUrl,
        },
      },
    );
  typia.assert(editedLinkPost);
  TestValidator.equals(
    "link post title updated",
    editedLinkPost.title,
    newLinkTitle,
  );
  TestValidator.equals("link post url updated", editedLinkPost.url, newLinkUrl);
  TestValidator.equals("link post content null", editedLinkPost.content, null);
  // 6. Test: Moderator edits an IMAGE post
  const originalImageTitle = RandomGenerator.name(2);
  const originalImageUrl = typia.random<
    string & tags.Format<"uri">
  >() as string;
  const imagePost = await api.functional.redditPlatform.member.posts.create(
    secondConnection2,
    {
      body: {
        title: originalImageTitle,
        postType: "IMAGE",
        redditPlatformCommunityId: community.id,
        imageUrl: originalImageUrl,
      },
    },
  );
  typia.assert(imagePost);
  const newImageTitle = RandomGenerator.name(3);
  const newImageUrl = typia.random<string & tags.Format<"uri">>() as string;
  const editedImagePost =
    await api.functional.redditPlatform.member.posts.update(
      moderatorConnection2,
      {
        postId: imagePost.id,
        body: {
          title: newImageTitle,
          image_url: newImageUrl,
        },
      },
    );
  typia.assert(editedImagePost);
  TestValidator.equals(
    "image post title updated",
    editedImagePost.title,
    newImageTitle,
  );
  TestValidator.equals(
    "image post image_url updated",
    editedImagePost.imageUrl,
    newImageUrl,
  );
  TestValidator.equals("image post url null", editedImagePost.url, null);
  // 7. Test: Moderator editing their own post (both author and moderator)
  const myOwnPost = await api.functional.redditPlatform.member.posts.create(
    moderatorConnection2,
    {
      body: {
        title: "My Own Post",
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: "Original content",
      },
    },
  );
  typia.assert(myOwnPost);
  const editedMyOwnPost =
    await api.functional.redditPlatform.member.posts.update(
      moderatorConnection2,
      {
        postId: myOwnPost.id,
        body: {
          title: "Edited My Own Post",
          content: "Edited content",
        },
      },
    );
  typia.assert(editedMyOwnPost);
  TestValidator.equals(
    "own post title updated",
    editedMyOwnPost.title,
    "Edited My Own Post",
  );
  TestValidator.equals(
    "own post content updated",
    editedMyOwnPost.content,
    "Edited content",
  );
}
