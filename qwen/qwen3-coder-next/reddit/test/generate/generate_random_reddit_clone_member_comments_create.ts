import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_content_comment } from "../prepare/prepare_random_reddit_clone_content_comment";

export async function generate_random_reddit_clone_member_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneContentComment.ICreate> | undefined;
  },
): Promise<IRedditCloneContentComment> {
  const prepared: IRedditCloneContentComment.ICreate =
    prepare_random_reddit_clone_content_comment(props.body);
  return await api.functional.redditClone.member.comments.create(connection, {
    body: prepared,
  });
}
