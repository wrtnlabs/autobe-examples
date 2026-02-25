import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment_vote } from "../prepare/prepare_random_community_platform_comment_vote";

export async function generate_random_community_platform_comment_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommentVote.ICreate> | undefined;
  },
): Promise<ICommunityPlatformCommentVote> {
  const prepared: ICommunityPlatformCommentVote.ICreate =
    prepare_random_community_platform_comment_vote(props.body);
  const result: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.commentVotes.create(connection, {
      body: prepared,
    });
  return result;
}
