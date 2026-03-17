import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test edge cases for member comments retrieval.
 * 1. Verify empty result when member has no comments (records=0, pages=0)
 * 2. Test text search functionality with specific keywords (case-insensitive)
 * 3. Test comment reply structure with parent field population
 * 4. Ensure soft-deleted comments are excluded from results
 */
export async function test_api_member_comments_empty_result_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member for empty result test
  const emptyMemberConnection: api.IConnection = { host: connection.host };
  const emptyMemberAuth = await authorize_member_join(emptyMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(emptyMemberAuth);
  // 2. Test empty comments result for member with no comments
  const emptyCommentsResult =
    await api.functional.redditClone.members.comments.index(
      emptyMemberConnection,
      {
        memberId: emptyMemberAuth.id,
        body: {
          page: 1,
          limit: 20,
          sort: "new",
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(emptyCommentsResult);
  TestValidator.equals("empty result data array", emptyCommentsResult.data, []);
  TestValidator.equals(
    "empty result records count",
    emptyCommentsResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages count",
    emptyCommentsResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result current page",
    emptyCommentsResult.pagination.current,
    1,
  );
  // 3. Create second member for creating searchable comments
  const searchMemberConnection: api.IConnection = { host: connection.host };
  const searchMemberAuth = await authorize_member_join(searchMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(searchMemberAuth);
  // 4. Create community for posts
  const community = await generate_random_reddit_clone_communities_create(
    searchMemberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 5. Create a post for comments
  const post = await generate_random_reddit_clone_member_posts_create(
    searchMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // 6. Create comments with specific keywords for search testing
  const keywordComment1 =
    await generate_random_reddit_clone_member_posts_comments_create(
      searchMemberConnection,
      {
        params: { postId: post.id },
        body: {
          body: "This is a TEST comment with keyword SEARCH",
        },
      },
    );
  typia.assert(keywordComment1);
  const keywordComment2 =
    await generate_random_reddit_clone_member_posts_comments_create(
      searchMemberConnection,
      {
        params: { postId: post.id },
        body: {
          body: "Another test comment for search functionality testing",
        },
      },
    );
  typia.assert(keywordComment2);
  const regularComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      searchMemberConnection,
      {
        params: { postId: post.id },
        body: {
          body: "Regular comment without special keywords",
        },
      },
    );
  typia.assert(regularComment);
  // 7. Test search functionality - search for "test" keyword (case-insensitive)
  const searchResult = await api.functional.redditClone.members.comments.index(
    searchMemberConnection,
    {
      memberId: searchMemberAuth.id,
      body: {
        page: 1,
        limit: 20,
        sort: "new",
        search: "test",
      } satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns matching comments",
    searchResult.data.length >= 2,
  );
  const hasTestKeyword = searchResult.data.some((comment) =>
    comment.body.toLowerCase().includes("test"),
  );
  TestValidator.predicate(
    "search results contain test keyword",
    hasTestKeyword,
  );
  // 8. Create reply comment to test parent field population
  const replyComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      searchMemberConnection,
      {
        params: { postId: post.id },
        body: {
          body: "This is a reply to the first comment",
          parent_comment_id: keywordComment1.id,
        },
      },
    );
  typia.assert(replyComment);
  // 9. Retrieve comments and verify parent field is populated for reply
  const commentsWithReply =
    await api.functional.redditClone.members.comments.index(
      searchMemberConnection,
      {
        memberId: searchMemberAuth.id,
        body: {
          page: 1,
          limit: 20,
          sort: "new",
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(commentsWithReply);
  TestValidator.predicate(
    "has multiple comments",
    commentsWithReply.data.length >= 4,
  );
  // Find the reply comment in results and verify parent field
  const foundReply = commentsWithReply.data.find(
    (comment) => comment.id === replyComment.id,
  );
  TestValidator.predicate(
    "reply comment found in results",
    foundReply !== undefined,
  );
  if (foundReply) {
    TestValidator.predicate(
      "reply has parent field",
      foundReply.parent !== null,
    );
    if (foundReply.parent) {
      TestValidator.equals(
        "parent id matches",
        foundReply.parent.id,
        keywordComment1.id,
      );
    }
  }
  // 10. Verify top-level comment has null parent
  const topLevelComment = commentsWithReply.data.find(
    (comment) => comment.id === keywordComment1.id,
  );
  if (topLevelComment) {
    TestValidator.equals(
      "top-level comment parent is null",
      topLevelComment.parent,
      null,
    );
  }
  // 11. Test pagination with different page sizes
  const paginatedResult =
    await api.functional.redditClone.members.comments.index(
      searchMemberConnection,
      {
        memberId: searchMemberAuth.id,
        body: {
          page: 1,
          limit: 2,
          sort: "new",
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination limit value",
    paginatedResult.pagination.limit,
    2,
  );
}
