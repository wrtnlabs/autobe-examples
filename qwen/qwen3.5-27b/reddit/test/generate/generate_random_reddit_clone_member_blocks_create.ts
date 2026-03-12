import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBlock } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBlock";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_block } from "../prepare/prepare_random_reddit_clone_block";

export async function generate_random_reddit_clone_member_blocks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneBlock.ICreate> | undefined;
  },
): Promise<IRedditCloneBlock> {
  const prepared: IRedditCloneBlock.ICreate = prepare_random_reddit_clone_block(
    props.body,
  );
  return await api.functional.redditClone.member.blocks.create(connection, {
    body: prepared,
  });
}
