import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
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
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_user_profile_with_full_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
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
          community_id: community.id,
        } satisfies IRedditClonePostTextContent.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      } satisfies IRedditClonePostLink.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Retrieve user profile by username
  const profile = await api.functional.redditClone.users.at(connection, {
    username: member.username,
  });
  typia.assert(profile);
  // 7. Validate profile response structure
  TestValidator.equals("username matches", profile.username, member.username);
  TestValidator.predicate(
    "karma_score is number",
    typeof profile.karma_score === "number",
  );
  TestValidator.predicate("posts is array", Array.isArray(profile.posts));
  TestValidator.predicate("comments is array", Array.isArray(profile.comments));
  TestValidator.predicate(
    "id is valid uuid",
    /^[0-9a-f-]{36}$/i.test(profile.id),
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(profile.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(profile.updated_at)),
  );
  // 8. Validate profile has at least one post
  TestValidator.predicate("has posts", profile.posts.length >= 1);
  const userPost = profile.posts.find((p) => p.id === post.id);
  TestValidator.notEquals("post found in profile", userPost, undefined);
  // 9. Validate profile has at least one comment
  TestValidator.predicate("has comments", profile.comments.length >= 1);
  const userComment = profile.comments.find((c) => c.id === comment.id);
  TestValidator.notEquals("comment found in profile", userComment, undefined);
  // 10. Validate post summary structure
  if (userPost) {
    TestValidator.equals("post title matches", userPost.title, post.title);
    TestValidator.equals("post type matches", userPost.type, post.type);
    TestValidator.predicate(
      "post vote_score is number",
      typeof userPost.vote_score === "number",
    );
    TestValidator.predicate(
      "post comment_count is number",
      typeof userPost.comment_count === "number",
    );
    TestValidator.equals(
      "post author username matches",
      userPost.author.username,
      member.username,
    );
    TestValidator.equals(
      "post community name matches",
      userPost.community.name,
      community.name,
    );
  }
  // 11. Validate comment summary structure
  if (userComment) {
    TestValidator.equals(
      "comment content matches",
      userComment.content,
      comment.content,
    );
    TestValidator.predicate(
      "comment vote_score is number",
      typeof userComment.vote_score === "number",
    );
    TestValidator.equals(
      "comment author username matches",
      userComment.author.username,
      member.username,
    );
    TestValidator.equals(
      "comment parent_comment_id is null",
      userComment.parent_comment_id,
      null,
    );
  }
  // 12. Validate profile summary (nested owner info)
  TestValidator.equals(
    "profile owner username matches",
    profile.profile.id,
    member.profile.id,
  );
  TestValidator.equals(
    "profile owner display_name matches",
    profile.profile.display_name,
    member.profile.display_name,
  );
}
