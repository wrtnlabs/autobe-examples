import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEconomicForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostComment";
import { prepare_random_economic_forum_post_comment } from "../prepare/prepare_random_economic_forum_post_comment";
export async function generate_random_economic_forum_user_posts_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicForumPostComment.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<IEconomicForumPostComment> {
  const prepared: IEconomicForumPostComment.ICreate =
    prepare_random_economic_forum_post_comment(props.body);
  const result: IEconomicForumPostComment =
    await api.functional.economicForum.user.posts.comments.create(connection, {
      body: prepared,
      postId: props.params.postId,
    });
  return result;
}
