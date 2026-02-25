import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_comment } from "../prepare/prepare_random_reddit_comment";

export async function generate_random_reddit_member_comments_replies_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditComment.ICreate> | undefined;
    params: {
      parentId: string;
    };
  },
): Promise<IRedditComment> {
  const prepared: IRedditComment.ICreate = prepare_random_reddit_comment(
    props.body,
  );
  const result: IRedditComment =
    await api.functional.reddit.member.comments.replies.create(connection, {
      parentId: props.params.parentId,
      body: prepared,
    });
  return result;
}
