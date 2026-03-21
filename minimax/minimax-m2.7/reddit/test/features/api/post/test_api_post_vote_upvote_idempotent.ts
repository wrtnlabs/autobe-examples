import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_post_vote_upvote_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member1 creates a community
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 2. Member2 joins, subscribes, and creates a text post
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditClonePostTextContent.ICreate,
    },
  );
  const post = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text" as const,
      },
    },
  );
  typia.assert(post);
  // 3. Member1 upvotes the post (first vote)
  const firstVote = await api.functional.redditClone.member.posts.votes.create(
    member1Connection,
    {
      postId: post.id,
    },
  );
  typia.assert(firstVote);
  // Store initial vote ID and timestamps for comparison
  const firstVoteId = firstVote.id;
  const firstVoteCreatedAt = firstVote.created_at;
  const firstVoteUpdatedAt = firstVote.updated_at;
  // 4. Member1 upvotes the same post again (idempotent call)
  const secondVote = await api.functional.redditClone.member.posts.votes.create(
    member1Connection,
    {
      postId: post.id,
    },
  );
  typia.assert(secondVote);
  // 5. Validation: Second upvote should return same vote ID (idempotent)
  TestValidator.equals(
    "vote ID should be the same (idempotent)",
    secondVote.id,
    firstVoteId,
  );
  // Validation: Direction should still be upvote
  TestValidator.equals(
    "vote direction should be upvote",
    secondVote.direction,
    "upvote",
  );
  // Validation: Member should be the same
  TestValidator.equals(
    "voter should be Member1",
    secondVote.member.id,
    member1.id,
  );
}
