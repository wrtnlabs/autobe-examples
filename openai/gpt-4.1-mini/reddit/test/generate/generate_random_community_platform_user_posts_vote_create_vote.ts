import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_vote } from "../prepare/prepare_random_community_platform_post_vote";

export async function generate_random_community_platform_user_posts_vote_create_vote(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostVote.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformPostVote.ISummary> {
  const prepared: ICommunityPlatformPostVote.ICreate =
    prepare_random_community_platform_post_vote(props.body);
  const result: ICommunityPlatformPostVote.ISummary =
    await api.functional.communityPlatform.user.posts.vote.createVote(
      connection,
      {
        postId: props.params.postId,
        body: prepared,
      },
    );
  return result;
}
