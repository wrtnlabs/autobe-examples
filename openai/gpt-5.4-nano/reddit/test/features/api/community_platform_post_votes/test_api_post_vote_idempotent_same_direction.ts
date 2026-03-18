import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_vote_idempotent_same_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (connection isolation pattern)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberHostConnection: api.IConnection = { host: connection.host };
  memberHostConnection.headers = {
    Authorization: member.token.access,
  };
  // 2) Create a community post as the authenticated member.
  const createdPost =
    await api.functional.communityPlatform.member.posts.create(
      memberHostConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(createdPost);
  const postId = (
    createdPost as unknown as {
      id: string;
    }
  ).id as string;
  // 3) First vote PATCH: upvote
  const firstVote =
    await api.functional.communityPlatform.member.posts.votes.updatePostVote(
      memberHostConnection,
      {
        postId: postId as string & tags.Format<"uuid">,
        body: {
          voteDirection: "upvote",
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(firstVote);
  // 4) Capture observable fields
  const firstVoteValue = firstVote.voteValue;
  const firstDeletedAt = firstVote.deletedAt;
  const firstVotedAt = firstVote.votedAt;
  // 5) Second vote PATCH with same direction
  const secondVote =
    await api.functional.communityPlatform.member.posts.votes.updatePostVote(
      memberHostConnection,
      {
        postId: postId as string & tags.Format<"uuid">,
        body: {
          voteDirection: "upvote",
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(secondVote);
  // 6) Validate idempotency: active state and score semantics unchanged
  TestValidator.equals(
    "voteValue unchanged",
    secondVote.voteValue,
    firstVoteValue,
  );
  TestValidator.equals(
    "deletedAt unchanged",
    secondVote.deletedAt,
    firstDeletedAt,
  );
  TestValidator.equals("votedAt unchanged", secondVote.votedAt, firstVotedAt);
}
