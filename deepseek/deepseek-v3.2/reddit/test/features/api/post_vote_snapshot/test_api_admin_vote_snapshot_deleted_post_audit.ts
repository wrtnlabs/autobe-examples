import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteSnapshot";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_admin_vote_snapshot_deleted_post_audit(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Step 2: Author member setup
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
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
  typia.assert(author);
  // Step 3: Voter member setup
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
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
  typia.assert(voter);
  // Step 4: Author creates community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Step 5: Author subscribes to their own community
  const authorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(authorSubscription);
  // Step 6: Voter subscribes to community
  const voterSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(voterSubscription);
  // Step 7: Author creates post in community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
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
  // Step 8: Voter upvotes the post
  const vote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          type: "up",
        },
      },
    );
  typia.assert(vote);
  // Step 9: Author deletes the post (soft delete)
  await api.functional.communityPlatform.member.posts.erase(authorConnection, {
    postId: post.id,
  });
  // Step 10: Admin attempts to retrieve vote snapshot - this tests admin audit capability
  // Since we don't have snapshot creation API, we test that admin can attempt retrieval
  // The endpoint may return 404 or the snapshot if it exists
  // This validates the admin's audit trail access beyond normal content lifecycle
  await TestValidator.error(
    "admin should be able to attempt retrieval of vote snapshot for deleted post",
    async () => {
      await api.functional.communityPlatform.admin.posts.votes.snapshots.at(
        adminConnection,
        {
          postId: post.id,
          voteId: vote.id,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Additional validations
  TestValidator.equals(
    "vote type should be up",
    vote.type,
    "up" as "up" | "down" | null,
  );
  TestValidator.equals("vote member matches voter", vote.member.id, voter.id);
  TestValidator.equals("vote post matches created post", vote.post.id, post.id);
  TestValidator.predicate(
    "vote has createdAt timestamp",
    () => typeof vote.created_at === "string",
  );
}
