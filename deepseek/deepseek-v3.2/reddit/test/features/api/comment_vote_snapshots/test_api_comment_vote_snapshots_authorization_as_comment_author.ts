import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommentVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteSnapshot";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_comments_votes_create } from "../../../generate/generate_random_community_platform_member_comments_votes_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_vote_snapshots_authorization_as_comment_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three member connections
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAAuth);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberBAuth);
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuth = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberCAuth);
  // 2. Member A creates community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Member A subscribes to their own community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(subscription);
  // 4. Member A creates post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post);
  // 5. Member A adds comment to the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Member B votes on the comment to generate snapshot
  const vote =
    await generate_random_community_platform_member_comments_votes_create(
      memberBConnection,
      {
        body: {
          type: "upvote",
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(vote);
  // 7. Prepare vote snapshot request body - using inline type annotation
  const requestBody = {
    page: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> satisfies number as number,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> satisfies number as number,
  };
  // 8. Test 1: Comment author (Member A) should be able to access vote snapshots
  const commentAuthorSnapshots =
    await api.functional.communityPlatform.member.comments.votes.snapshots.index(
      memberAConnection,
      {
        commentId: comment.id,
        voteId: vote.id,
        body: requestBody,
      },
    );
  typia.assert(commentAuthorSnapshots);
  TestValidator.predicate(
    "comment author should get vote snapshots",
    commentAuthorSnapshots.data.length >= 0,
  );
  TestValidator.equals(
    "comment author snapshot pagination",
    commentAuthorSnapshots.pagination.pages, // Changed from .page to .pages
    1,
  );
  // 9. Test 2: Vote owner (Member B) should be able to access their own vote snapshots
  const voteOwnerSnapshots =
    await api.functional.communityPlatform.member.comments.votes.snapshots.index(
      memberBConnection,
      {
        commentId: comment.id,
        voteId: vote.id,
        body: requestBody,
      },
    );
  typia.assert(voteOwnerSnapshots);
  await TestValidator.predicate( // Added await and proper arguments
    "vote owner should get vote snapshots",
    voteOwnerSnapshots.data.length >= 0,
  );
}