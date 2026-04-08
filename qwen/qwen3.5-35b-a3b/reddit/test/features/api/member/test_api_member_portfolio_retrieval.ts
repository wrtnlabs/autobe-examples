import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_member_portfolio_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: "Test Admin",
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuthorized);
  const memberId = memberAuthorized.id;
  // 3. Create posts as member (text and link types)
  const textPost = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        post_type: "text" as const,
        reddit_community_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        text_content: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);
  const linkPost = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        post_type: "link" as const,
        reddit_community_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        link_url: "https://example.com/article",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);
  // 4. Create comments as member
  const textComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityComment.ICreate,
        params: { postId: textPost.id },
      },
    );
  typia.assert(textComment);
  const linkComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityComment.ICreate,
        params: { postId: linkPost.id },
      },
    );
  typia.assert(linkComment);
  // 5. Retrieve portfolio
  const response =
    await api.functional.redditCommunity.admin.members.portfolio.at(
      connection,
      {
        memberId: memberId,
      },
    );
  typia.assert(response);
  // 6. Validate portfolio structure
  TestValidator.equals("portfolio id", response.id, memberId);
  TestValidator.equals(
    "portfolio username",
    response.username,
    memberAuthorized.username,
  );
  TestValidator.predicate(
    "karma score is number",
    typeof response.karmaScore === "number",
  );
  TestValidator.equals("posts count", response.posts.length, 2);
  TestValidator.equals("comments count", response.comments.length, 2);
  // 7. Validate posts
  const sortedPosts = [...response.posts].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.index(
    "posts sorted by created_at DESC",
    sortedPosts,
    response.posts,
  );
  typia.assert(response.posts[0]);
  typia.assert(response.posts[1]);
  TestValidator.equals(
    "post title exists",
    response.posts[0].title.length > 0,
    true,
  );
  TestValidator.equals(
    "post type valid",
    ["text", "link", "image"].includes(response.posts[0].post_type),
    true,
  );
  TestValidator.equals(
    "vote score numeric",
    typeof response.posts[0].vote_score === "number",
    true,
  );
  TestValidator.equals(
    "comment count numeric",
    typeof response.posts[0].comment_count === "number",
    true,
  );
  TestValidator.equals(
    "posts deleted_at null",
    response.posts[0].deleted_at,
    null,
  );
  typia.assert(response.posts[0].author);
  typia.assert(response.posts[0].community);
  // 8. Validate comments
  const sortedComments = [...response.comments].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.index(
    "comments sorted by created_at DESC",
    sortedComments,
    response.comments,
  );
  typia.assert(response.comments[0]);
  typia.assert(response.comments[1]);
  TestValidator.equals(
    "comment content exists",
    response.comments[0].content.length > 0,
    true,
  );
  TestValidator.equals(
    "comment vote count numeric",
    typeof response.comments[0].vote_count === "number",
    true,
  );
  TestValidator.equals(
    "comment is_top_level boolean",
    typeof response.comments[0].is_top_level === "boolean",
    true,
  );
  TestValidator.equals(
    "comment reply count numeric",
    typeof response.comments[0].reply_count === "number",
    true,
  );
  TestValidator.equals(
    "comments deleted_at null",
    response.comments[0].deleted_at,
    null,
  );
  typia.assert(response.comments[0].author);
}
