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
import { generate_random_reddit_clone_member_reddit_clone_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_votes_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_post_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Member A (community creator)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  // 3. Authenticate as Member B (post author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 4. Member B subscribes to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberBConnection,
    {
      body: { communityId: community.id },
    },
  );
  // 5. Member B creates a text post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  const postAuthorId = post.author.id;
  // 6. Authenticate as Member C (voter)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  // 7. Member C subscribes to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberCConnection,
    {
      body: { communityId: community.id },
    },
  );
  // 8. Member C casts initial upvote on the post
  const initialVote =
    await generate_random_reddit_clone_member_reddit_clone_posts_votes_create(
      memberCConnection,
      {
        params: { postId: post.id },
        body: { direction: "upvote" },
      },
    );
  typia.assert(initialVote);
  TestValidator.equals(
    "initial vote direction is upvote",
    initialVote.direction,
    "upvote",
  );
  // 9. Update vote direction from upvote to downvote
  const updatedVote =
    await api.functional.redditClone.member.redditClone.posts.votes.update(
      memberCConnection,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: {
          id: initialVote.id,
          direction: "downvote",
          created_at: initialVote.created_at,
          updated_at: initialVote.updated_at,
          member: initialVote.member,
          post: initialVote.post,
        } satisfies IRedditClonePostVote,
      },
    );
  typia.assert(updatedVote);
  // Validation: Vote direction changed to downvote
  TestValidator.equals(
    "updated vote direction is downvote",
    updatedVote.direction,
    "downvote",
  );
  TestValidator.equals("vote ID preserved", updatedVote.id, initialVote.id);
  TestValidator.predicate(
    "updated_at changed",
    updatedVote.updated_at !== initialVote.created_at,
  );
}
