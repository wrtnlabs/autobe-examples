import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_member_comments_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create authenticated connection
  const memberAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // Extract member ID from JWT token
  const tokenPayload = JSON.parse(
    Buffer.from(memberAuth.token.access.split(".")[1], "base64").toString(),
  );
  const memberId: string = tokenPayload.user_id ?? tokenPayload.id;
  typia.assert<string & tags.Format<"uuid">>(memberId);
  // 2. Create multiple posts for commenting
  // Note: Using a random UUID for community_id as community creation API is not available
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const posts: IRedditCommunityPost[] = [];
  const postCount = 5;
  for (let i = 0; i < postCount; i++) {
    const postType = RandomGenerator.pick(["text" as const, "link" as const]);
    const postBody: IRedditCommunityPost.ICreate = {
      community_id: communityId,
      post_type: postType,
      title: RandomGenerator.name(3),
    };
    if (postType === "text") {
      postBody.body = RandomGenerator.paragraph({ sentences: 2 });
    } else if (postType === "link") {
      postBody.url = typia.random<string & tags.Format<"url">>();
    }
    const post = await api.functional.redditCommunity.member.posts.create(
      memberAuthenticatedConnection,
      { body: postBody },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 3. Generate 50+ comments across posts
  const commentCount = 55;
  for (let i = 0; i < commentCount; i++) {
    const postId = posts[i % posts.length].id;
    const comment =
      await api.functional.redditCommunity.member.posts.comments.create(
        memberAuthenticatedConnection,
        {
          postId,
          body: {
            body: RandomGenerator.paragraph({
              sentences: RandomGenerator.pick([1, 2, 3]),
            }),
          },
        },
      );
    typia.assert(comment);
  }
  // 4. Test default sorting (reverse chronological) - newest first
  const defaultPage =
    await api.functional.redditCommunity.member.users.comments.index(
      memberAuthenticatedConnection,
      {
        userId: memberId,
        body: { limit: 20 },
      },
    );
  typia.assert(defaultPage);
  // 5. Test 'best' sorting - highest vote scores first
  const bestPage =
    await api.functional.redditCommunity.member.users.comments.index(
      memberAuthenticatedConnection,
      {
        userId: memberId,
        body: { limit: 20, sort: "best" as const },
      },
    );
  typia.assert(bestPage);
  TestValidator.predicate("best sorting - highest votes first", () =>
    bestPage.data
      .slice(0, -1)
      .every(
        (c, i) =>
          i === bestPage.data.length - 1 ||
          c.voteScore >= bestPage.data[i + 1].voteScore,
      ),
  );
  // 6. Test 'new' sorting - explicit newest first
  const newPage =
    await api.functional.redditCommunity.member.users.comments.index(
      memberAuthenticatedConnection,
      {
        userId: memberId,
        body: { limit: 20, sort: "new" as const },
      },
    );
  typia.assert(newPage);
  TestValidator.equals(
    "new sorting - matches default order",
    newPage.data.map((c) => c.id),
    defaultPage.data.map((c) => c.id),
  );
  // 7. Test 'controversial' sorting - high absolute scores near zero
  const controversialPage =
    await api.functional.redditCommunity.member.users.comments.index(
      memberAuthenticatedConnection,
      {
        userId: memberId,
        body: { limit: 20, sort: "controversial" as const },
      },
    );
  typia.assert(controversialPage);
  TestValidator.predicate(
    "controversial sorting - high absolute scores first",
    () =>
      controversialPage.data
        .slice(0, -1)
        .every((c, i) =>
          i === controversialPage.data.length - 1
            ? true
            : Math.abs(c.voteScore) >=
              Math.abs(controversialPage.data[i + 1].voteScore),
        ),
  );
  // 8. Test pagination with limit 10
  const page10 =
    await api.functional.redditCommunity.member.users.comments.index(
      memberAuthenticatedConnection,
      {
        userId: memberId,
        body: { limit: 10, page: 1 },
      },
    );
  typia.assert(page10);
  TestValidator.equals(
    "limit 10 - first page has 10 items",
    page10.data.length,
    10,
  );
  TestValidator.equals(
    "limit 10 - pagination records",
    page10.pagination.records,
    commentCount,
  );
  TestValidator.equals(
    "limit 10 - pagination pages calculated correctly",
    page10.pagination.pages,
    Math.ceil(commentCount / 10),
  );
  // 9. Test pagination with limit 20
  const page20 =
    await api.functional.redditCommunity.member.users.comments.index(
      memberAuthenticatedConnection,
      {
        userId: memberId,
        body: { limit: 20, page: 1 },
      },
    );
  typia.assert(page20);
  TestValidator.equals(
    "limit 20 - first page has 20 items",
    page20.data.length,
    20,
  );
  TestValidator.equals(
    "limit 20 - pagination records",
    page20.pagination.records,
    commentCount,
  );
  TestValidator.equals(
    "limit 20 - pagination pages",
    page20.pagination.pages,
    Math.ceil(commentCount / 20),
  );
  // 10. Test pagination with limit 50
  const page50 =
    await api.functional.redditCommunity.member.users.comments.index(
      memberAuthenticatedConnection,
      {
        userId: memberId,
        body: { limit: 50, page: 1 },
      },
    );
  typia.assert(page50);
  TestValidator.equals(
    "limit 50 - first page has 50 items",
    page50.data.length,
    50,
  );
  TestValidator.equals(
    "limit 50 - pagination records",
    page50.pagination.records,
    commentCount,
  );
  TestValidator.equals(
    "limit 50 - pagination pages",
    page50.pagination.pages,
    Math.ceil(commentCount / 50),
  );
  // 11. Test cursor-based navigation across pages
  const page2 =
    await api.functional.redditCommunity.member.users.comments.index(
      memberAuthenticatedConnection,
      {
        userId: memberId,
        body: { limit: 20, page: 2 },
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "limit 20 - second page has items",
    page2.data.length,
    35,
  );
  // 12. Verify structure matches IPageIRedditCommunityComment.ISummary
  TestValidator.equals(
    "page has pagination field",
    typeof defaultPage.pagination,
    "object",
  );
  TestValidator.equals(
    "page has data array",
    Array.isArray(defaultPage.data),
    true,
  );
  TestValidator.equals(
    "pagination has current",
    typeof defaultPage.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof defaultPage.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof defaultPage.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof defaultPage.pagination.pages,
    "number",
  );
  // 13. Verify comment ISummary fields
  if (defaultPage.data.length > 0) {
    const sampleComment = defaultPage.data[0];
    TestValidator.equals("comment has id", typeof sampleComment.id, "string");
    TestValidator.equals(
      "comment has voteScore",
      typeof sampleComment.voteScore,
      "number",
    );
    TestValidator.equals(
      "comment has createdAt",
      typeof sampleComment.createdAt,
      "string",
    );
    TestValidator.equals(
      "comment has author",
      typeof sampleComment.author,
      "object",
    );
    TestValidator.equals(
      "comment has parentComment",
      sampleComment.parentComment === null ||
        typeof sampleComment.parentComment === "object",
      true,
    );
    TestValidator.equals(
      "comment has replyCount",
      typeof sampleComment.replyCount,
      "number",
    );
    TestValidator.equals(
      "comment author matches member",
      sampleComment.author.id,
      memberId,
    );
  }
  // 14. Test author validation - all comments should be from the same member
  const allAuthorIds = defaultPage.data.map((c) => c.author.id);
  TestValidator.predicate("all comments have same author", () =>
    allAuthorIds.every((id) => id === memberId),
  );
}
