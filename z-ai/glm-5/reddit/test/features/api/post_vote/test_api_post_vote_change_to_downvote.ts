import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_vote_create } from "../../../generate/generate_random_community_platform_member_posts_vote_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_change_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Author setup - create community and post
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // 2. Voting member setup
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // 3. Cast initial upvote
  const upvote =
    await generate_random_community_platform_member_posts_vote_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: {
          targetType: "post",
          targetId: post.id,
          voteType: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(upvote);
  // Verify initial upvote
  TestValidator.equals("initial vote type", upvote.voteType, "upvote");
  TestValidator.equals("target type", upvote.targetType, "post");
  TestValidator.equals("target ID matches post", upvote.targetId, post.id);
  // Store original timestamps
  const originalCreatedAt = upvote.createdAt;
  const originalUpdatedAt = upvote.updatedAt;
  // 4. Change vote from upvote to downvote
  const changedVote =
    await api.functional.communityPlatform.member.posts.vote.update(
      voterConnection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
          target_type: "post",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(changedVote);
  // 5. Verify vote change - same record updated
  TestValidator.equals(
    "vote ID unchanged (record updated)",
    changedVote.id,
    upvote.id,
  );
  TestValidator.equals(
    "vote type changed to downvote",
    changedVote.voteType,
    "downvote",
  );
  TestValidator.equals("target type preserved", changedVote.targetType, "post");
  TestValidator.equals("target ID preserved", changedVote.targetId, post.id);
  // 6. Verify timestamps
  TestValidator.equals(
    "created_at unchanged",
    changedVote.createdAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is newer",
    new Date(changedVote.updatedAt).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  // 7. Verify member relation preserved
  TestValidator.equals(
    "member ID preserved",
    changedVote.member.id,
    upvote.member.id,
  );
}
