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

export async function test_api_post_vote_upvote_new(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // TEST: Upvote a post as an authenticated member
  // ============================================================
  // This test verifies the upvoting functionality when a member
  // upvotes a post they haven't voted on before. The test creates:
  // 1. Member1 who will vote on the post
  // 2. A community created by Member1
  // 3. Member2 who subscribes to the community and creates a post
  // 4. Member1 upvotes the post
  // ============================================================
  // Step 1: Member1 joins to vote on the post later
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  // Step 2: Member1 creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  // Step 3: Member2 joins to be the post author
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // Step 4: Member2 subscribes to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // Step 5: Member2 creates a text post
  const post = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  // Step 6: Member1 upvotes the post
  const vote = await api.functional.redditClone.member.posts.votes.create(
    member1Connection,
    {
      postId: post.id,
    },
  );
  typia.assert(vote);
  // ============================================================
  // VALIDATION
  // ============================================================
  // Validate the vote was created with correct direction
  TestValidator.equals(
    "vote direction should be upvote",
    vote.direction,
    "upvote",
  );
  // Validate the vote is associated with the correct member (Member1)
  TestValidator.equals(
    "vote member id should match voter",
    vote.member.id,
    member1.id,
  );
  // Validate the vote record has valid timestamps
  TestValidator.predicate(
    "vote should have valid created_at timestamp",
    vote.created_at !== null && vote.created_at !== undefined,
  );
  TestValidator.predicate(
    "vote should have valid updated_at timestamp",
    vote.updated_at !== null && vote.updated_at !== undefined,
  );
}
