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

export async function test_api_karma_history_chronological_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create content creator member
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuth = await authorize_member_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(creatorAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      creatorConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      creatorConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create first post (text type)
  const firstPost = await api.functional.redditCommunity.member.posts.create(
    creatorConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(firstPost);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Create second post (text type)
  const secondPost = await api.functional.redditCommunity.member.posts.create(
    creatorConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(secondPost);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Create comment on first post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      creatorConnection,
      {
        postId: firstPost.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 7. Create first voter and vote on first post
  const voter1Connection: api.IConnection = { host: connection.host };
  const voter1Auth = await authorize_member_join(voter1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(voter1Auth);
  const voter1Vote =
    await generate_random_reddit_community_member_posts_vote_create(
      voter1Connection,
      {
        params: { postId: firstPost.id },
        body: { direction: "UPVOTE" },
      },
    );
  typia.assert(voter1Vote);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 8. Create second voter and vote on second post
  const voter2Connection: api.IConnection = { host: connection.host };
  const voter2Auth = await authorize_member_join(voter2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(voter2Auth);
  const voter2Vote =
    await generate_random_reddit_community_member_posts_vote_create(
      voter2Connection,
      {
        params: { postId: secondPost.id },
        body: { direction: "UPVOTE" },
      },
    );
  typia.assert(voter2Vote);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 9. Voter1 votes on comment
  const commentVote =
    await generate_random_reddit_community_member_comments_vote(
      voter1Connection,
      {
        params: { commentId: comment.id },
        body: { direction: "UPVOTE" },
      },
    );
  typia.assert(commentVote);
  // 10. Retrieve karma history with default sort (descending - newest first)
  const karmaDesc =
    await api.functional.redditCommunity.member.karma_histories.index(
      creatorConnection,
      {
        body: {
          sort: "created_at_desc",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(karmaDesc);
  TestValidator.predicate(
    "karma history has records",
    karmaDesc.data.length >= 3,
  );
  TestValidator.equals(
    "pagination current page",
    karmaDesc.pagination.current,
    1,
  );
  // Verify descending order (newest first)
  if (karmaDesc.data.length >= 2) {
    const firstTimestamp = new Date(karmaDesc.data[0].created_at).getTime();
    const secondTimestamp = new Date(karmaDesc.data[1].created_at).getTime();
    TestValidator.predicate(
      "descending order - newest first",
      firstTimestamp >= secondTimestamp,
    );
  }
  // 11. Retrieve karma history with ascending sort (oldest first)
  const karmaAsc =
    await api.functional.redditCommunity.member.karma_histories.index(
      creatorConnection,
      {
        body: {
          sort: "created_at_asc",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(karmaAsc);
  TestValidator.equals(
    "ascending record count",
    karmaAsc.data.length,
    karmaDesc.data.length,
  );
  // Verify ascending order (oldest first)
  if (karmaAsc.data.length >= 2) {
    const firstTimestamp = new Date(karmaAsc.data[0].created_at).getTime();
    const secondTimestamp = new Date(karmaAsc.data[1].created_at).getTime();
    TestValidator.predicate(
      "ascending order - oldest first",
      firstTimestamp <= secondTimestamp,
    );
  }
  // 12. Test date range filtering - get middle timestamp
  if (karmaAsc.data.length >= 3) {
    const middleRecord = karmaAsc.data[Math.floor(karmaAsc.data.length / 2)];
    const middleTime = new Date(middleRecord.created_at).getTime();
    const fromTime = new Date(middleTime - 1000).toISOString();
    const toTime = new Date(middleTime + 1000).toISOString();
    const karmaDateFiltered =
      await api.functional.redditCommunity.member.karma_histories.index(
        creatorConnection,
        {
          body: {
            created_at_from: fromTime,
            created_at_to: toTime,
            sort: "created_at_asc",
            limit: 10,
            page: 1,
          },
        },
      );
    typia.assert(karmaDateFiltered);
    // Verify all returned records are within date range
    for (const record of karmaDateFiltered.data) {
      const recordTime = new Date(record.created_at).getTime();
      TestValidator.predicate(
        "record within date range",
        recordTime >= new Date(fromTime).getTime() &&
          recordTime <= new Date(toTime).getTime(),
      );
    }
  }
  // 13. Test voter_id filtering
  const karmaVoterFiltered =
    await api.functional.redditCommunity.member.karma_histories.index(
      creatorConnection,
      {
        body: {
          voter_id: voter1Auth.id,
          sort: "created_at_asc",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(karmaVoterFiltered);
  // Verify all records are from voter1
  for (const record of karmaVoterFiltered.data) {
    TestValidator.predicate(
      "voter matches filter",
      record.voter === null || record.voter.id === voter1Auth.id,
    );
  }
  // 14. Test edge case - no matching records with future date
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const karmaEmpty =
    await api.functional.redditCommunity.member.karma_histories.index(
      creatorConnection,
      {
        body: {
          created_at_from: futureDate,
          sort: "created_at_asc",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(karmaEmpty);
  TestValidator.equals(
    "empty result for future date",
    karmaEmpty.data.length,
    0,
  );
  TestValidator.equals(
    "empty pagination records",
    karmaEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pagination pages",
    karmaEmpty.pagination.pages,
    0,
  );
  // 15. Verify source_type filtering
  const karmaPostOnly =
    await api.functional.redditCommunity.member.karma_histories.index(
      creatorConnection,
      {
        body: {
          source_type: "POST",
          sort: "created_at_asc",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(karmaPostOnly);
  for (const record of karmaPostOnly.data) {
    TestValidator.equals("source type is POST", record.source_type, "POST");
  }
  const karmaCommentOnly =
    await api.functional.redditCommunity.member.karma_histories.index(
      creatorConnection,
      {
        body: {
          source_type: "COMMENT",
          sort: "created_at_asc",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(karmaCommentOnly);
  for (const record of karmaCommentOnly.data) {
    TestValidator.equals(
      "source type is COMMENT",
      record.source_type,
      "COMMENT",
    );
  }
}