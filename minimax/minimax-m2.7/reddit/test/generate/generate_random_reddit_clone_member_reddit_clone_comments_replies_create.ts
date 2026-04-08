import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_comment } from "../prepare/prepare_random_reddit_clone_comment";

export async function generate_random_reddit_clone_member_reddit_clone_comments_replies_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneComment.ICreate>;
    params: {
      commentId: string;
    };
  },
): Promise<IRedditCloneComment> {
  const prepared: IRedditCloneComment.ICreate =
    prepare_random_reddit_clone_comment(props.body);
  const result: IRedditCloneComment =
    await api.functional.redditClone.member.redditClone.comments.replies.create(
      connection,
      {
        body: prepared,
        commentId: props.params.commentId,
      },
    );
  return result;
}
