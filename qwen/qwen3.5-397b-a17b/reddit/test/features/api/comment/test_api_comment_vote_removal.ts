import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import type { IRedditCloneVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test comment vote removal workflow.
 * 1. Create community with owner
 * 2. Register member A (voter) and member B (comment author)
 * 3. Member A subscribes to community
 * 4. Member B creates a post in the community
 * 5. Member B creates a comment on the post
 * 6. Member A casts initial UPVOTE on the comment
 * 7. Member A removes vote by submitting vote_type=null
 * 8. Validate vote record has deleted_at populated and vote_type preserved
 */
export async function test_api_comment_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community (using owner connection)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(owner);
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 2. Register member A (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(voter);
  // 3. Register member B (comment author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(author);
  // 4. Member A subscribes to community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 5. Member B creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT" as const,
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // 6. Member B creates a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      authorConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 7. Member A casts initial UPVOTE on the comment
  const initialVote =
    await api.functional.redditClone.member.comments.vote.putByCommentid(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditCloneVote.IVote,
      },
    );
  typia.assert(initialVote);
  TestValidator.equals("initial vote type", initialVote.vote_type, "UPVOTE");
  TestValidator.predicate(
    "initial vote not deleted",
    initialVote.deleted_at === null,
  );
  // 8. Member A removes vote by submitting vote_type=null
  const removalVote =
    await api.functional.redditClone.member.comments.vote.putByCommentid(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: null,
        } satisfies IRedditCloneVote.IVote,
      },
    );
  typia.assert(removalVote);
  // Validate vote record has deleted_at populated
  TestValidator.predicate(
    "vote removed with deleted_at",
    removalVote.deleted_at !== null,
  );
  TestValidator.equals("vote type preserved", removalVote.vote_type, "UPVOTE");
}
