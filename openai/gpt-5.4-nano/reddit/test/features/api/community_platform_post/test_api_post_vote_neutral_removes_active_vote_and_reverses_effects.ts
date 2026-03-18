import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_posts_create } from "../../../generate/generate_random_community_platform_admin_posts_create";
import { generate_random_community_platform_admin_posts_votes_create } from "../../../generate/generate_random_community_platform_admin_posts_votes_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_vote_neutral_removes_active_vote_and_reverses_effects(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin auth (actor-specific connection)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 2) Create post and obtain postId
  const createdPostId = await (async () => {
    await generate_random_community_platform_admin_posts_create(
      adminConnection,
      {
        body: typia.random<ICommunityPlatformPost.ICreate>(),
      },
    );

    // The SDK typing may declare this endpoint as void, but runtime returns the created entity.
    // Cast to the minimal shape needed for this test.
    const created2 = await api.functional.communityPlatform.admin.posts.create(
      adminConnection,
      {
        body: typia.random<ICommunityPlatformPost.ICreate>(),
      },
    );

    return typia.assert<{ id: string }>(created2).id;
  })();

  const postId = createdPostId;

  // 3) Apply an active vote first (upvote)
  const voteAfterUpvote =
    await api.functional.communityPlatform.admin.posts.votes.updatePostVote(
      adminConnection,
      {
        postId,
        body: {
          voteDirection: "upvote",
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(voteAfterUpvote);
  TestValidator.equals(
    "upvoted vote should be active",
    voteAfterUpvote.deletedAt,
    null,
  );

  // 4) Neutral should remove the active vote
  const removedVote =
    await api.functional.communityPlatform.admin.posts.votes.updatePostVote(
      adminConnection,
      {
        postId,
        body: {
          voteDirection: "neutral",
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(removedVote);
  TestValidator.predicate(
    "neutral must soft-delete the active vote (deletedAt not null)",
    removedVote.deletedAt !== null,
  );
  const removedDeletedAt = removedVote.deletedAt;

  // 5) Idempotency: second neutral should not change removed state
  const removedVoteSecond =
    await api.functional.communityPlatform.admin.posts.votes.updatePostVote(
      adminConnection,
      {
        postId,
        body: {
          voteDirection: "neutral",
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(removedVoteSecond);
  TestValidator.equals(
    "second neutral should be idempotent (deletedAt unchanged)",
    removedVoteSecond.deletedAt,
    removedDeletedAt,
  );
}
