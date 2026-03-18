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

export async function test_api_post_vote_update_switching_back_and_forth_single_record(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail: string & typia.tags.Format<"email"> = typia.random<
    string & typia.tags.Format<"email">
  >();
  const memberPassword: string & typia.tags.Format<"password"> = typia.random<
    string & typia.tags.Format<"password">
  >();
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const postId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  const voteId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  const initialVoteValue: number & typia.tags.Type<"int32"> = typia.random<
    number & typia.tags.Type<"int32"> & typia.tags.Minimum<1>
  >();
  const oppositeVoteValue: number & typia.tags.Type<"int32"> =
    (initialVoteValue * -1) as number & typia.tags.Type<"int32">;

  const voteValueInt32 = (
    value: number & typia.tags.Type<"int32">,
  ): number & tags.Type<"int32"> & tags.Minimum<-2147483648> & tags.Maximum<2147483647> => {
    return typia.assert<
      number & tags.Type<"int32"> & tags.Minimum<-2147483648> & tags.Maximum<2147483647>
    >(value);
  };

  const firstUpdate = await api.functional.communityPlatform.member.posts.votes.update(
    memberConnection,
    {
      postId,
      voteId,
      body: {
        voteValue: voteValueInt32(initialVoteValue),
      } satisfies ICommunityPlatformPostVote.IUpdate,
    },
  );
  typia.assert(firstUpdate);

  const secondUpdate = await api.functional.communityPlatform.member.posts.votes.update(
    memberConnection,
    {
      postId,
      voteId,
      body: {
        voteValue: voteValueInt32(oppositeVoteValue),
      } satisfies ICommunityPlatformPostVote.IUpdate,
    },
  );
  typia.assert(secondUpdate);

  const thirdUpdate = await api.functional.communityPlatform.member.posts.votes.update(
    memberConnection,
    {
      postId,
      voteId,
      body: {
        voteValue: voteValueInt32(initialVoteValue),
      } satisfies ICommunityPlatformPostVote.IUpdate,
    },
  );
  typia.assert(thirdUpdate);

  TestValidator.equals(
    "vote id preserved after first switch",
    secondUpdate.id,
    voteId,
  );
  TestValidator.equals(
    "vote id preserved after second switch",
    thirdUpdate.id,
    voteId,
  );
  TestValidator.equals(
    "vote value switches to opposite",
    secondUpdate.voteValue,
    oppositeVoteValue,
  );
  TestValidator.equals(
    "vote value switches back to original",
    thirdUpdate.voteValue,
    initialVoteValue,
  );
}
