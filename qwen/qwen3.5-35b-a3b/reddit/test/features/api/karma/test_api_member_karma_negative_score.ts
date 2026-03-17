import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
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

export async function test_api_member_karma_negative_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (target member who will have negative karma)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAUsername = memberAEmail.split("@")[0];
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Create voter member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBUsername = memberBEmail.split("@")[0];
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // 3. Create voter member C
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCEmail = typia.random<string & tags.Format<"email">>();
  const memberCUsername = memberCEmail.split("@")[0];
  const memberCAuth = await authorize_member_join(memberCConnection, {
    body: {
      email: memberCEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberCAuth);
  // 4. Get member A's profile to verify they exist
  const memberAProfile: IRedditCommunityMember.IProfile =
    await api.functional.redditCommunity.members.at(
      { host: connection.host },
      { memberId: memberAUsername },
    );
  typia.assert(memberAProfile);
  TestValidator.predicate(
    "member A profile retrieved",
    memberAProfile !== null,
  );
  // 5. List communities and select one
  const communitiesResponse: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(
      { host: connection.host },
      {
        body: {},
      },
    );
  typia.assert(communitiesResponse);
  TestValidator.predicate(
    "communities exist",
    communitiesResponse.data.length > 0,
  );
  const community = communitiesResponse.data[0];
  // 6. Subscribe all members to the community (required before creating posts/voting)
  await api.functional.redditCommunity.member.subscriptions.index(
    memberAConnection,
    {
      body: {},
    },
  );
  await api.functional.redditCommunity.member.subscriptions.index(
    memberBConnection,
    {
      body: {},
    },
  );
  await api.functional.redditCommunity.member.subscriptions.index(
    memberCConnection,
    {
      body: {},
    },
  );
  // 7. Member A creates three posts that will receive downvotes
  const post1 = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post2);
  const post3 = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post3);
  // 8. Voter B downvotes all three posts by member A (-3 karma for A)
  await api.functional.redditCommunity.member.votes.create(memberBConnection, {
    body: {
      vote_type: "downvote",
      target_post_id: post1.id,
    } satisfies IRedditCommunityVote.ICreate,
  });
  await api.functional.redditCommunity.member.votes.create(memberBConnection, {
    body: {
      vote_type: "downvote",
      target_post_id: post2.id,
    } satisfies IRedditCommunityVote.ICreate,
  });
  await api.functional.redditCommunity.member.votes.create(memberBConnection, {
    body: {
      vote_type: "downvote",
      target_post_id: post3.id,
    } satisfies IRedditCommunityVote.ICreate,
  });
  // 9. Voter C downvotes all three posts by member A (-3 karma for A)
  await api.functional.redditCommunity.member.votes.create(memberCConnection, {
    body: {
      vote_type: "downvote",
      target_post_id: post1.id,
    } satisfies IRedditCommunityVote.ICreate,
  });
  await api.functional.redditCommunity.member.votes.create(memberCConnection, {
    body: {
      vote_type: "downvote",
      target_post_id: post2.id,
    } satisfies IRedditCommunityVote.ICreate,
  });
  await api.functional.redditCommunity.member.votes.create(memberCConnection, {
    body: {
      vote_type: "downvote",
      target_post_id: post3.id,
    } satisfies IRedditCommunityVote.ICreate,
  });
  // 10. Voter B upvotes one of member A's posts (+1 karma for A, cancels one downvote)
  await api.functional.redditCommunity.member.votes.create(memberBConnection, {
    body: {
      vote_type: "upvote",
      target_post_id: post1.id,
    } satisfies IRedditCommunityVote.ICreate,
  });
  // 11. Query member A's karma score
  const karma: IRedditCommunityUserKarma =
    await api.functional.redditCommunity.members.karma.at(
      { host: connection.host },
      { memberId: memberAUsername },
    );
  typia.assert(karma);
  // 12. Validate karma is negative: 5 downvotes - 1 upvote = -4 net karma
  TestValidator.equals(
    "karma score is negative after more downvotes than upvotes",
    karma.current_score,
    -4,
  );
  TestValidator.predicate(
    "karma score is negative value",
    karma.current_score < 0,
  );
}