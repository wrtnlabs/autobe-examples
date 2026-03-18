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

export async function test_api_post_vote_direction_change_up_to_down(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const upVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.member.posts.votes.updatePostVote(
      memberConnection,
      {
        postId,
        body: {
          voteDirection: "upvote",
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(upVote);
  TestValidator.equals(
    "communityPlatformPostId matches",
    upVote.communityPlatformPostId,
    postId,
  );
  TestValidator.equals("voterId matches", upVote.voterId, member.id);
  TestValidator.predicate(
    "voteValue positive for upvote",
    upVote.voteValue > 0,
  );
  TestValidator.equals(
    "deletedAt is null for active vote",
    upVote.deletedAt,
    null,
  );
  const downVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.member.posts.votes.updatePostVote(
      memberConnection,
      {
        postId,
        body: {
          voteDirection: "downvote",
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(downVote);
  TestValidator.equals(
    "communityPlatformPostId matches after direction change",
    downVote.communityPlatformPostId,
    postId,
  );
  TestValidator.equals(
    "voterId matches after direction change",
    downVote.voterId,
    member.id,
  );
  TestValidator.predicate(
    "voteValue negative for downvote",
    downVote.voteValue < 0,
  );
  TestValidator.equals(
    "deletedAt remains null for active vote",
    downVote.deletedAt,
    null,
  );
  TestValidator.notEquals(
    "vote updatedAt differs after change",
    upVote.updatedAt,
    downVote.updatedAt,
  );
}
