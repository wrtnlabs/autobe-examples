import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityKarmaSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityKarmaSnapshot";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityKarmaSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaSnapshot";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_votes_create } from "../../../generate/generate_random_reddit_community_member_votes_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_vote } from "../../../prepare/prepare_random_reddit_community_vote";

export async function test_api_karma_snapshots_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate two members
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAResult = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAResult);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBResult = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberBResult);
  // 2. Create posts under each member to get their IDs
  const postA = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: "Post by Member A",
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        body: "This is post A",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(postA);
  const postB = await api.functional.redditCommunity.member.posts.create(
    memberBConnection,
    {
      body: {
        title: "Post by Member B",
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        body: "This is post B",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(postB);
  const memberAId = postA.author.id;
  const memberBId = postB.author.id;
  // 3. Create votes (B upvotes A's post, A upvotes B's post)
  // This creates karma snapshots for A (from B's vote) and B (from A's vote)
  const vote1 = await api.functional.redditCommunity.member.votes.create(
    memberBConnection,
    {
      body: {
        vote_type: "upvote",
        target_post_id: postA.id,
      } satisfies IRedditCommunityVote.ICreate,
    },
  );
  typia.assert(vote1);
  const vote2 = await api.functional.redditCommunity.member.votes.create(
    memberAConnection,
    {
      body: {
        vote_type: "upvote",
        target_post_id: postB.id,
      } satisfies IRedditCommunityVote.ICreate,
    },
  );
  typia.assert(vote2);
  // 4. Fetch all karma snapshots
  const allSnapshots =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      connection,
      {
        body: { limit: 100 },
      },
    );
  typia.assert(allSnapshots);
  // 5. Test filter by karma_delta (+1)
  const deltaPositiveSnapshots =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      connection,
      {
        body: { karma_delta: 1, limit: 100 },
      },
    );
  typia.assert(deltaPositiveSnapshots);
  deltaPositiveSnapshots.data.forEach((snapshot) => {
    TestValidator.equals("all positive delta are +1", snapshot.karma_delta, 1);
  });
  // 6. Test filter by user_id (Member A)
  const userSpecificSnapshots =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      connection,
      {
        body: { user_id: memberAId, limit: 100 },
      },
    );
  typia.assert(userSpecificSnapshots);
  userSpecificSnapshots.data.forEach((snapshot) => {
    TestValidator.equals(
      "snapshots belong to member A",
      snapshot.user.id,
      memberAId,
    );
  });
  // 7. Test filter by vote_id
  const voteSpecificSnapshots =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      connection,
      {
        body: { vote_id: vote1.id, limit: 100 },
      },
    );
  typia.assert(voteSpecificSnapshots);
  TestValidator.equals(
    "vote specific snapshots count",
    voteSpecificSnapshots.data.length,
    1,
  );
  if (voteSpecificSnapshots.data.length > 0) {
    TestValidator.equals(
      "vote ID matches",
      voteSpecificSnapshots.data[0].vote.id,
      vote1.id,
    );
  }
  // 8. Test combined filters (karma_delta + user_id)
  const combinedSnapshots =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      connection,
      {
        body: { karma_delta: 1, user_id: memberAId, limit: 100 },
      },
    );
  typia.assert(combinedSnapshots);
  combinedSnapshots.data.forEach((snapshot) => {
    TestValidator.equals(
      "combined filter: delta is +1",
      snapshot.karma_delta,
      1,
    );
    TestValidator.equals(
      "combined filter: user is A",
      snapshot.user.id,
      memberAId,
    );
  });
  // 9. Test date range filtering
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const snapshotsInRange =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      connection,
      {
        body: {
          created_at_start: fiveMinutesAgo.toISOString(),
          created_at_end: now.toISOString(),
          limit: 100,
        },
      },
    );
  typia.assert(snapshotsInRange);
  // 10. Test pagination with filters
  const firstPage =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      connection,
      {
        body: {
          karma_delta: 1,
          limit: 1,
          sort: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(firstPage);
  if (
    firstPage.data.length > 0 &&
    firstPage.pagination.current < firstPage.pagination.pages
  ) {
    const secondPage =
      await api.functional.redditCommunity.member.karma_snapshots.index(
        connection,
        {
          body: {
            karma_delta: 1,
            limit: 1,
            sort: "created_at",
            order: "desc",
            cursor: firstPage.data[0].created_at,
          },
        },
      );
    typia.assert(secondPage);
    if (secondPage.data.length > 0) {
      TestValidator.notEquals(
        "second page has different data",
        firstPage.data[0].id,
        secondPage.data[0].id,
      );
    }
  }
  // 11. Verify snapshots are for correct users (post authors, not voters)
  // Vote1: B voted on A's post -> snapshot should be for A
  const vote1Snapshots =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      connection,
      {
        body: { vote_id: vote1.id, limit: 100 },
      },
    );
  typia.assert(vote1Snapshots);
  if (vote1Snapshots.data.length > 0) {
    TestValidator.equals(
      "vote1 snapshot is for post author (A)",
      vote1Snapshots.data[0].user.id,
      memberAId,
    );
  }
  // Vote2: A voted on B's post -> snapshot should be for B
  const vote2Snapshots =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      connection,
      {
        body: { vote_id: vote2.id, limit: 100 },
      },
    );
  typia.assert(vote2Snapshots);
  if (vote2Snapshots.data.length > 0) {
    TestValidator.equals(
      "vote2 snapshot is for post author (B)",
      vote2Snapshots.data[0].user.id,
      memberBId,
    );
  }
}
