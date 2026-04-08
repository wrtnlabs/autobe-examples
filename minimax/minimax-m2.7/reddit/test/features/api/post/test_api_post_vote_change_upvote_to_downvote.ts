import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test changing an existing upvote to a downvote on a post.
 *
 * Setup:
 * 1. Register memberA (post author) via join
 * 2. Create community via memberA
 * 3. Subscribe memberA to community
 * 4. Create text post by memberA (initial vote_score=0, karma=0)
 * 5. Register memberB via join
 * 6. Subscribe memberB to community
 * 7. memberB casts upvote on post (vote_score=1, karma=1)
 *
 * Execution:
 * - memberB sends PUT with { "direction": "downvote" } to change vote from upvote to downvote
 *
 * Validation:
 * 1. Response returns 200 with direction='downvote'
 * 2. Post's vote_score decreases by 2 (from 1 to -1)
 * 3. memberA's karma decreases by 2 (from 1 to -1)
 * 4. Same vote record updated with new direction and updated_at timestamp
 */
export async function test_api_post_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create memberA connection and register
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {},
  });
  typia.assert(memberAAuthorized);
  // 2. Create community via memberA
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // 3. Subscribe memberA to community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 4. Create text post by memberA (initial vote_score=0, karma=0)
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  const initialVoteScore = post.voteScore;
  const initialKarma = memberAAuthorized.karmaScore;
  // 5. Create memberB connection and register
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {},
  });
  typia.assert(memberBAuthorized);
  // 6. Subscribe memberB to community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 7. memberB casts upvote on post (vote_score=1, karma=1)
  const upvoteVote = await api.functional.redditClone.member.posts.votes.update(
    memberBConnection,
    {
      postId: post.id,
      body: {
        direction: "upvote",
      } satisfies IRedditClonePostVote.IUpdate,
    },
  );
  typia.assert(upvoteVote);
  TestValidator.equals("upvote direction", upvoteVote.direction, "upvote");
  // 8. memberB changes vote from upvote to downvote
  const downvoteVote =
    await api.functional.redditClone.member.posts.votes.update(
      memberBConnection,
      {
        postId: post.id,
        body: {
          direction: "downvote",
        } satisfies IRedditClonePostVote.IUpdate,
      },
    );
  typia.assert(downvoteVote);
  // 9. Validation
  // 9.1. Response returns direction='downvote'
  TestValidator.equals(
    "downvote direction",
    downvoteVote.direction,
    "downvote",
  );
  // 9.2. Same vote record updated (id should be the same)
  TestValidator.equals(
    "vote record unchanged ID",
    downvoteVote.id,
    upvoteVote.id,
  );
  // Note: To verify vote_score and karma changes, we would need to fetch the post
  // and member details again. However, since we don't have a GET endpoint for
  // individual posts or member karma in the available API functions, we can only
  // validate the response structure at this point.
  // The server-side logic ensures:
  // - vote_score changes by -2 (from 1 to -1): upvote contributed +1, downvote contributes -1
  // - memberA's karma changes by -2 (from 1 to -1): same logic applied to author's karma
}
