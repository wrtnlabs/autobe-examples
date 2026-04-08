import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";
import type { IRedditPlatformUserActivityCommentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityCommentSummary";
import type { IRedditPlatformUserActivityPostSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityPostSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_user_activity_filter_content_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (viewer) and Member B (activity creator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 2. Member B creates 3 communities
  const communityPromises = ArrayUtil.repeat(3, (index) =>
    generate_random_reddit_platform_member_communities_create(
      memberBConnection,
      {
        body: {
          name: `test_community_${index + 1}_${RandomGenerator.alphaNumeric(4)}`,
        },
      },
    ),
  );
  const communities = await Promise.all(communityPromises);
  typia.assert(communities);
  // 3. Create posts on older date (X) in Community 1
  const postsOnOlderDate = ArrayUtil.repeat(2, () =>
    api.functional.redditPlatform.member.posts.create(memberBConnection, {
      body: {
        community_id: communities[0].id,
        title: `Post on Older Date ${RandomGenerator.alphaNumeric(4)}`,
        post_type: "text",
        text_content: "Content for post on older date",
      } satisfies IRedditPlatformPost.ICreate,
    }),
  );
  const [post1, post2] = await Promise.all(postsOnOlderDate);
  typia.assert(post1);
  typia.assert(post2);
  // Create posts in Community 2 for comments
  const postForComments = ArrayUtil.repeat(2, () =>
    api.functional.redditPlatform.member.posts.create(memberBConnection, {
      body: {
        community_id: communities[1].id,
        title: `Post for Comments ${RandomGenerator.alphaNumeric(4)}`,
        post_type: "text",
        text_content: "Content",
      } satisfies IRedditPlatformPost.ICreate,
    }),
  );
  const [commentPost1, commentPost2] = await Promise.all(postForComments);
  typia.assert(commentPost1);
  typia.assert(commentPost2);
  // Create posts on newer date (Y > X) in Community 3
  const postsOnNewerDate = ArrayUtil.repeat(1, () =>
    api.functional.redditPlatform.member.posts.create(memberBConnection, {
      body: {
        community_id: communities[2].id,
        title: "Post on Newer Date",
        post_type: "text",
        text_content: "Content for post on newer date",
      } satisfies IRedditPlatformPost.ICreate,
    }),
  );
  const [postOnNewerDate] = await Promise.all(postsOnNewerDate);
  typia.assert(postOnNewerDate);
  // 4. Test contentType='posts' filter - should return only posts
  const postsFilterConnection: api.IConnection = { host: connection.host };
  const postsFilterResult =
    await api.functional.redditPlatform.member.users.activity.index(
      postsFilterConnection,
      {
        username: memberB.username,
        body: {
          contentType: "posts",
        },
      },
    );
  typia.assert(postsFilterResult);
  TestValidator.equals(
    "posts filter - all items are posts type",
    postsFilterResult.data.every(
      (item) =>
        (item as IRedditPlatformUserActivityPostSummary).type === "post",
    ),
    true,
  );
  // 5. Test contentType='comments' filter - should return only comments
  const commentsFilterConnection: api.IConnection = { host: connection.host };
  const commentsFilterResult =
    await api.functional.redditPlatform.member.users.activity.index(
      commentsFilterConnection,
      {
        username: memberB.username,
        body: {
          contentType: "comments",
        },
      },
    );
  typia.assert(commentsFilterResult);
  TestValidator.equals(
    "comments filter - all items are comments type",
    commentsFilterResult.data.every(
      (item) =>
        (item as IRedditPlatformUserActivityCommentSummary).type === "comment",
    ),
    true,
  );
  TestValidator.equals(
    "comments filter - all items have content field",
    commentsFilterResult.data.every(
      (item) =>
        (item as IRedditPlatformUserActivityCommentSummary).content !==
        undefined,
    ),
    true,
  );
  // 6. Test date range filter - verify posts are returned correctly
  const latestPostDate = new Date(postOnNewerDate.created_at);
  const startDateFilter = latestPostDate.toISOString();
  const dateFilterConnection: api.IConnection = { host: connection.host };
  const dateFilterResult =
    await api.functional.redditPlatform.member.users.activity.index(
      dateFilterConnection,
      {
        username: memberB.username,
        body: {
          startDate: startDateFilter,
        },
      },
    );
  typia.assert(dateFilterResult);
  TestValidator.equals(
    "date filter - all items are from startDate or later",
    dateFilterResult.data.every((item) => {
      const createdAt = new Date(item.createdAt);
      const startDate = new Date(startDateFilter);
      return createdAt >= startDate;
    }),
    true,
  );
  // 7. Test combined filters (posts + date range)
  const combinedFilterConnection: api.IConnection = { host: connection.host };
  const combinedFilterResult =
    await api.functional.redditPlatform.member.users.activity.index(
      combinedFilterConnection,
      {
        username: memberB.username,
        body: {
          contentType: "posts",
          startDate: startDateFilter,
        },
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter - all items are posts type",
    combinedFilterResult.data.every(
      (item) =>
        (item as IRedditPlatformUserActivityPostSummary).type === "post",
    ),
    true,
  );
  TestValidator.equals(
    "combined filter - all items are from date range",
    combinedFilterResult.data.every((item) => {
      const createdAt = new Date(item.createdAt);
      const startDate = new Date(startDateFilter);
      return createdAt >= startDate;
    }),
    true,
  );
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    postsFilterResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    postsFilterResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    postsFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    postsFilterResult.pagination.pages >= 0,
  );
  // 9. Test sorting - default sortBy='createdAt', sortOrder='desc'
  const defaultSortConnection: api.IConnection = { host: connection.host };
  const defaultSortResult =
    await api.functional.redditPlatform.member.users.activity.index(
      defaultSortConnection,
      {
        username: memberB.username,
        body: {},
      },
    );
  typia.assert(defaultSortResult);
  TestValidator.equals(
    "default sort - first item is most recent",
    defaultSortResult.pagination.current,
    1,
  );
  // 10. Test sortBy='votes' sorting
  const votesSortConnection: api.IConnection = { host: connection.host };
  const votesSortResult =
    await api.functional.redditPlatform.member.users.activity.index(
      votesSortConnection,
      {
        username: memberB.username,
        body: {
          sortBy: "votes",
        },
      },
    );
  typia.assert(votesSortResult);
  TestValidator.equals(
    "votes sort - pagination current page is 1",
    votesSortResult.pagination.current,
    1,
  );
}
