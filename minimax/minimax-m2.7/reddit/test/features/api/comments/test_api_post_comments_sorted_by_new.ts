import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
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

/**
 * Test retrieving comments for a post sorted by 'new' (creation time).
 * 1. Authenticate as member
 * 2. Create a community and subscribe to it
 * 3. Create a post within the community
 * 4. Create multiple comments at different times to establish distinct created_at timestamps
 * 5. Call the target endpoint with sortBy='new' and verify comments are returned in descending order
 * 6. Test pagination by requesting page 2 with limit 5
 * 7. Verify pagination metadata accurately reflects total comments and current page position
 */
export async function test_api_post_comments_sorted_by_new(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community and subscribe to it
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 3. Create a post within the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 4. Create multiple comments at different times to establish distinct created_at timestamps
  const commentCount = 12;
  const comments: IRedditCloneComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberConnection,
        {
          params: { postId: post.id },
          body: {
            content: `Comment ${i + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 5. Call the target endpoint with sortBy='new' and verify comments are returned in descending order
  const firstPageResponse =
    await api.functional.redditClone.member.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sortBy: "new",
          page: 1,
          limit: 5,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  // Verify pagination metadata for first page
  TestValidator.equals(
    "total records match",
    firstPageResponse.pagination.records,
    commentCount,
  );
  TestValidator.equals(
    "current page is 1",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 5", firstPageResponse.pagination.limit, 5);
  TestValidator.equals("total pages", firstPageResponse.pagination.pages, 3);
  // Verify comments are sorted by created_at in descending order (most recent first)
  for (let i = 0; i < firstPageResponse.data.length - 1; i++) {
    const current = firstPageResponse.data[i];
    const next = firstPageResponse.data[i + 1];
    const currentTime = new Date(current.created_at).getTime();
    const nextTime = new Date(next.created_at).getTime();
    TestValidator.predicate(
      `Comment at index ${i} should be newer than comment at index ${i + 1}`,
      currentTime >= nextTime,
    );
  }
  // 6. Test pagination by requesting page 2 with limit 5
  const secondPageResponse =
    await api.functional.redditClone.member.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sortBy: "new",
          page: 2,
          limit: 5,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  // Verify pagination metadata for second page
  TestValidator.equals(
    "current page is 2",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit is still 5",
    secondPageResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "same total records",
    secondPageResponse.pagination.records,
    commentCount,
  );
  // Verify comments on page 2 are correctly offset (next 5 oldest comments from page 1)
  for (let i = 0; i < secondPageResponse.data.length - 1; i++) {
    const current = secondPageResponse.data[i];
    const next = secondPageResponse.data[i + 1];
    const currentTime = new Date(current.created_at).getTime();
    const nextTime = new Date(next.created_at).getTime();
    TestValidator.predicate(
      `Comment at index ${i} on page 2 should be newer than comment at index ${i + 1}`,
      currentTime >= nextTime,
    );
  }
  // Verify that page 2 comments are older than page 1 comments
  if (firstPageResponse.data.length > 0 && secondPageResponse.data.length > 0) {
    const oldestOnPage1 =
      firstPageResponse.data[firstPageResponse.data.length - 1];
    const newestOnPage2 = secondPageResponse.data[0];
    const oldestPage1Time = new Date(oldestOnPage1.created_at).getTime();
    const newestPage2Time = new Date(newestOnPage2.created_at).getTime();
    TestValidator.predicate(
      "Oldest comment on page 1 should be newer than newest comment on page 2",
      oldestPage1Time >= newestPage2Time,
    );
  }
  // 7. Test page 3 (last page with remaining comments)
  const thirdPageResponse =
    await api.functional.redditClone.member.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sortBy: "new",
          page: 3,
          limit: 5,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(thirdPageResponse);
  // Verify pagination metadata for third page
  TestValidator.equals(
    "current page is 3",
    thirdPageResponse.pagination.current,
    3,
  );
  TestValidator.equals(
    "limit is still 5",
    thirdPageResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "records on last page",
    thirdPageResponse.data.length,
    commentCount - 10,
  );
  // Verify comments are still sorted correctly on last page
  for (let i = 0; i < thirdPageResponse.data.length - 1; i++) {
    const current = thirdPageResponse.data[i];
    const next = thirdPageResponse.data[i + 1];
    const currentTime = new Date(current.created_at).getTime();
    const nextTime = new Date(next.created_at).getTime();
    TestValidator.predicate(
      `Comment at index ${i} on page 3 should be newer than comment at index ${i + 1}`,
      currentTime >= nextTime,
    );
  }
}
