import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserKarmaHistory";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUserKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarmaHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_vote } from "../../../generate/generate_random_reddit_community_member_comments_vote";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_vote_create } from "../../../generate/generate_random_reddit_community_member_posts_vote_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";

export async function test_api_karma_history_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (karma history owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      member1Connection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a post
  const post = await api.functional.redditCommunity.member.posts.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      member1Connection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Create second member (voter)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member2Auth);
  // 7. Second member subscribes to community
  await api.functional.redditCommunity.member.communities.subscription.create(
    member2Connection,
    {
      communityName: community.name,
    },
  );
  // 8. Second member upvotes the post (generates +1 karma for member1)
  const postVote =
    await generate_random_reddit_community_member_posts_vote_create(
      member2Connection,
      {
        body: {
          direction: "UPVOTE",
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(postVote);
  // 9. Second member downvotes the comment (generates -1 karma for member1)
  const commentVote =
    await generate_random_reddit_community_member_comments_vote(
      member2Connection,
      {
        body: {
          direction: "DOWNVOTE",
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(commentVote);
  // 10. Retrieve karma history for member1
  const karmaHistory =
    await api.functional.redditCommunity.member.karma_histories.index(
      member1Connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IRedditCommunityUserKarmaHistory.IRequest,
      },
    );
  typia.assert(karmaHistory);
  // 11. Validate pagination metadata
  TestValidator.equals("current page", karmaHistory.pagination.current, 1);
  TestValidator.equals("limit", karmaHistory.pagination.limit, 10);
  TestValidator.predicate("has records", karmaHistory.pagination.records >= 2);
  TestValidator.predicate("has pages", karmaHistory.pagination.pages >= 1);
  // 12. Validate karma history records
  TestValidator.predicate("has data", karmaHistory.data.length >= 2);
  const postKarmaRecord = karmaHistory.data.find(
    (record) => record.source_type === "POST" && record.source_id === post.id,
  );
  TestValidator.predicate(
    "post karma record exists",
    postKarmaRecord !== undefined,
  );
  if (postKarmaRecord) {
    TestValidator.equals(
      "post upvote change",
      postKarmaRecord.change_amount,
      1,
    );
    TestValidator.predicate(
      "post new_total positive",
      postKarmaRecord.new_total > 0,
    );
    TestValidator.equals(
      "post source_type",
      postKarmaRecord.source_type,
      "POST",
    );
    TestValidator.equals("post source_id", postKarmaRecord.source_id, post.id);
    TestValidator.predicate(
      "post voter exists",
      postKarmaRecord.voter !== null,
    );
    if (postKarmaRecord.voter) {
      TestValidator.equals(
        "post voter id",
        postKarmaRecord.voter.id,
        member2Auth.id,
      );
    }
  }
  const commentKarmaRecord = karmaHistory.data.find(
    (record) =>
      record.source_type === "COMMENT" && record.source_id === comment.id,
  );
  TestValidator.predicate(
    "comment karma record exists",
    commentKarmaRecord !== undefined,
  );
  if (commentKarmaRecord) {
    TestValidator.equals(
      "comment downvote change",
      commentKarmaRecord.change_amount,
      -1,
    );
    TestValidator.predicate(
      "comment voter exists",
      commentKarmaRecord.voter !== null,
    );
    if (commentKarmaRecord.voter) {
      TestValidator.equals(
        "comment voter id",
        commentKarmaRecord.voter.id,
        member2Auth.id,
      );
    }
  }
  // 13. Test filtering by source_type = POST
  const postOnlyHistory =
    await api.functional.redditCommunity.member.karma_histories.index(
      member1Connection,
      {
        body: {
          page: 1,
          limit: 10,
          source_type: "POST",
        } satisfies IRedditCommunityUserKarmaHistory.IRequest,
      },
    );
  typia.assert(postOnlyHistory);
  TestValidator.predicate(
    "post filter has data",
    postOnlyHistory.data.length >= 1,
  );
  postOnlyHistory.data.forEach((record) => {
    TestValidator.equals("all records are POST", record.source_type, "POST");
  });
  // 14. Test filtering by source_type = COMMENT
  const commentOnlyHistory =
    await api.functional.redditCommunity.member.karma_histories.index(
      member1Connection,
      {
        body: {
          page: 1,
          limit: 10,
          source_type: "COMMENT",
        } satisfies IRedditCommunityUserKarmaHistory.IRequest,
      },
    );
  typia.assert(commentOnlyHistory);
  TestValidator.predicate(
    "comment filter has data",
    commentOnlyHistory.data.length >= 1,
  );
  commentOnlyHistory.data.forEach((record) => {
    TestValidator.equals(
      "all records are COMMENT",
      record.source_type,
      "COMMENT",
    );
  });
  // 15. Test sorting - create more votes to test ordering
  const post2 = await api.functional.redditCommunity.member.posts.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post2);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const post2Vote =
    await generate_random_reddit_community_member_posts_vote_create(
      member2Connection,
      {
        body: {
          direction: "UPVOTE",
        },
        params: {
          postId: post2.id,
        },
      },
    );
  typia.assert(post2Vote);
  // Retrieve with created_at_desc (newest first)
  const descHistory =
    await api.functional.redditCommunity.member.karma_histories.index(
      member1Connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IRedditCommunityUserKarmaHistory.IRequest,
      },
    );
  typia.assert(descHistory);
  // Verify newest is first
  if (descHistory.data.length >= 2) {
    const firstTime = new Date(descHistory.data[0].created_at).getTime();
    const secondTime = new Date(descHistory.data[1].created_at).getTime();
    TestValidator.predicate("desc sort newest first", firstTime >= secondTime);
  }
  // Retrieve with created_at_asc (oldest first)
  const ascHistory =
    await api.functional.redditCommunity.member.karma_histories.index(
      member1Connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at_asc",
        } satisfies IRedditCommunityUserKarmaHistory.IRequest,
      },
    );
  typia.assert(ascHistory);
  // Verify oldest is first
  if (ascHistory.data.length >= 2) {
    const firstTime = new Date(ascHistory.data[0].created_at).getTime();
    const secondTime = new Date(ascHistory.data[1].created_at).getTime();
    TestValidator.predicate("asc sort oldest first", firstTime <= secondTime);
  }
  // 16. Test pagination with small limit
  const paginatedHistory =
    await api.functional.redditCommunity.member.karma_histories.index(
      member1Connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IRedditCommunityUserKarmaHistory.IRequest,
      },
    );
  typia.assert(paginatedHistory);
  TestValidator.equals(
    "pagination limit",
    paginatedHistory.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination has records",
    paginatedHistory.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    paginatedHistory.pagination.pages >= 2,
  );
  TestValidator.equals(
    "page 1 has one record",
    paginatedHistory.data.length,
    1,
  );
  // Get page 2
  const page2History =
    await api.functional.redditCommunity.member.karma_histories.index(
      member1Connection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IRedditCommunityUserKarmaHistory.IRequest,
      },
    );
  typia.assert(page2History);
  TestValidator.equals("page 2 current", page2History.pagination.current, 2);
  TestValidator.equals("page 2 has one record", page2History.data.length, 1);
  // Verify page 1 and page 2 have different records
  if (paginatedHistory.data.length > 0 && page2History.data.length > 0) {
    TestValidator.notEquals(
      "page 1 and 2 different records",
      paginatedHistory.data[0].id,
      page2History.data[0].id,
    );
  }
}
