import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reddit_clone_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_comments_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_user_profile_view_with_complete_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // 6. Retrieve the user's profile by username
  const profile = await api.functional.redditClone.users.profile.at(
    memberConnection,
    {
      username: authorized.username,
    },
  );
  typia.assert(profile);
  // Validate profile structure
  TestValidator.equals(
    "displayName exists",
    typeof profile.displayName === "string",
    true,
  );
  TestValidator.equals(
    "bio is string or null",
    profile.bio === null || typeof profile.bio === "string",
    true,
  );
  TestValidator.equals(
    "avatar is null or object",
    profile.avatar === null || typeof profile.avatar === "object",
    true,
  );
  TestValidator.equals(
    "karmaScore is number",
    typeof profile.karmaScore === "number",
    true,
  );
  TestValidator.equals("karmaScore >= 0", profile.karmaScore >= 0, true);
  TestValidator.equals(
    "member is object",
    typeof profile.member === "object",
    true,
  );
  TestValidator.equals(
    "member has id",
    typeof profile.member.id === "string",
    true,
  );
  TestValidator.equals(
    "member has username",
    typeof profile.member.username === "string",
    true,
  );
  TestValidator.equals(
    "member username matches",
    profile.member.username,
    authorized.username,
  );
  // Validate posts array
  TestValidator.predicate(
    "posts array has at least one post",
    profile.posts.length >= 1,
  );
  const userPost = profile.posts.find((p) => p.id === post.id);
  TestValidator.notEquals(
    "created post exists in profile",
    userPost,
    undefined,
  );
  TestValidator.equals("post has id", typeof userPost!.id === "string", true);
  TestValidator.equals(
    "post has title",
    typeof userPost!.title === "string",
    true,
  );
  TestValidator.equals("post type is text", userPost!.type, "text");
  TestValidator.equals(
    "post has author",
    typeof userPost!.author === "object",
    true,
  );
  TestValidator.equals(
    "post has community",
    typeof userPost!.community === "object",
    true,
  );
  TestValidator.equals(
    "post has voteScore",
    typeof userPost!.voteScore === "number",
    true,
  );
  TestValidator.equals(
    "post has commentCount",
    typeof userPost!.commentCount === "number",
    true,
  );
  TestValidator.equals(
    "post has createdAt",
    typeof userPost!.createdAt === "string",
    true,
  );
  // Validate comments array
  TestValidator.predicate(
    "comments array has at least one comment",
    profile.comments.length >= 1,
  );
  const userComment = profile.comments.find((c) => c.id === comment.id);
  TestValidator.notEquals(
    "created comment exists in profile",
    userComment,
    undefined,
  );
  TestValidator.equals(
    "comment has id",
    typeof userComment!.id === "string",
    true,
  );
  TestValidator.equals(
    "comment has content",
    typeof userComment!.content === "string",
    true,
  );
  TestValidator.equals(
    "comment has author",
    typeof userComment!.author === "object",
    true,
  );
  TestValidator.equals(
    "comment has voteScore",
    typeof userComment!.voteScore === "number",
    true,
  );
  TestValidator.equals(
    "comment has createdAt",
    typeof userComment!.createdAt === "string",
    true,
  );
}
