import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_comment_vote } from "../prepare/prepare_random_reddit_platform_comment_vote";

export async function generate_random_reddit_platform_member_comment_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformCommentVote.ICreate>;
  },
): Promise<IRedditPlatformCommentVote> {
  const prepared: IRedditPlatformCommentVote.ICreate =
    prepare_random_reddit_platform_comment_vote(props.body);
  const result: IRedditPlatformCommentVote =
    await api.functional.redditPlatform.member.comment_votes.create(
      connection,
      { body: prepared },
    );
  return result;
}
