import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneKarmaScoreChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneKarmaScoreChange";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneKarmaScoreChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScoreChange";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_vote } from "../../../generate/generate_random_reddit_clone_member_posts_vote";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

export async function test_api_karma_score_change_history_post_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A (karma score owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
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
  typia.assert(memberA);
  // 2. Member A creates a community
  const community = await generate_random_reddit_clone_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Member A creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Authenticate as member B (first voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
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
  typia.assert(memberB);
  // 5. Member B upvotes member A's post, generating +1 karma change
  const upvote = await generate_random_reddit_clone_member_posts_vote(
    memberBConnection,
    {
      body: { vote_type: "UPVOTE" },
      params: { postId: post.id },
    },
  );
  typia.assert(upvote);
  // 6. Authenticate as member C (second voter)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
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
  typia.assert(memberC);
  // 7. Member C downvotes member A's post, generating -1 karma change
  const downvote = await generate_random_reddit_clone_member_posts_vote(
    memberCConnection,
    {
      body: { vote_type: "DOWNVOTE" },
      params: { postId: post.id },
    },
  );
  typia.assert(downvote);
  // 8. Retrieve member A's karma score ID
  const karmaScore = await api.functional.redditClone.karma_scores.at(
    memberAConnection,
    {
      memberId: memberA.id,
    },
  );
  typia.assert(karmaScore);
  // 9. Query karma changes with source_type filter set to 'POST'
  const karmaChanges =
    await api.functional.redditClone.karma_scores.changes.index(
      memberAConnection,
      {
        karmaScoreId: karmaScore.id,
        body: {
          source_type: "POST",
          sort: "created_at:desc",
        } satisfies IRedditCloneKarmaScoreChange.IRequest,
      },
    );
  typia.assert(karmaChanges);
  // Validate: Response contains exactly 2 karma change events
  TestValidator.equals("total records", karmaChanges.pagination.records, 2);
  TestValidator.equals("total pages", karmaChanges.pagination.pages, 1);
  TestValidator.equals("data length", karmaChanges.data.length, 2);
  // Validate: Both changes have source_type 'POST'
  TestValidator.equals(
    "first change source_type",
    karmaChanges.data[0].source_type,
    "POST",
  );
  TestValidator.equals(
    "second change source_type",
    karmaChanges.data[1].source_type,
    "POST",
  );
  // Validate: Both changes reference the same post title
  TestValidator.equals(
    "first change source_title",
    karmaChanges.data[0].source_title,
    post.title,
  );
  TestValidator.equals(
    "second change source_title",
    karmaChanges.data[1].source_title,
    post.title,
  );
  // Validate: Changes are ordered by created_at descending (most recent first)
  // Downvote was created after upvote, so it should be first
  TestValidator.predicate("downvote is first (most recent)", () => {
    const firstChange = karmaChanges.data[0];
    const secondChange = karmaChanges.data[1];
    return firstChange.change_amount === -1 && secondChange.change_amount === 1;
  });
  // Validate: Change amounts are correct (+1 for upvote, -1 for downvote)
  const changeAmounts = karmaChanges.data.map((c) => c.change_amount).sort();
  TestValidator.equals("change amounts include -1", changeAmounts[0], -1);
  TestValidator.equals("change amounts include +1", changeAmounts[1], 1);
  // Validate: Pagination metadata
  TestValidator.equals("current page", karmaChanges.pagination.current, 1);
  TestValidator.predicate(
    "limit is valid",
    () => karmaChanges.pagination.limit > 0,
  );
}
