import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
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
import { generate_random_reddit_clone_member_reddit_clone_comments_votes_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_comments_votes_create";
import { generate_random_reddit_clone_member_reddit_clone_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_comments_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_comment_vote_remove_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member1 (comment author)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  // 2. Create member2 (voter)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  // 3. Create member3 (unauthorized remover)
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {});
  // 4. member1 creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  // 5. All members subscribe to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    member1Connection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  await generate_random_reddit_clone_member_subscriptions_create(
    member3Connection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  // 6. member1 creates a post
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  // 7. member1 creates a comment
  const comment =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      member1Connection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCloneComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  // 8. member2 casts a vote on the comment
  const vote =
    await generate_random_reddit_clone_member_reddit_clone_comments_votes_create(
      member2Connection,
      {
        body: {
          direction: "upvote",
        } satisfies IRedditClonePostVote.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  // 9. member3 (unauthorized) attempts to remove member2's vote
  // Expected: HTTP 403 Forbidden
  await TestValidator.error(
    "unauthorized vote removal should return 403",
    async () =>
      await api.functional.redditClone.member.redditClone.comments.votes.erase(
        member3Connection,
        {
          commentId: comment.id,
          voteId: vote.id,
        },
      ),
  );
}
