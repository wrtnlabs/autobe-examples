import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import { prepare_random_economic_forum_post } from "../prepare/prepare_random_economic_forum_post";
export async function generate_random_economic_forum_user_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicForumPost.ICreate>;
  },
): Promise<IEconomicForumPost> {
  const prepared: IEconomicForumPost.ICreate =
    prepare_random_economic_forum_post(props.body);
  const result: IEconomicForumPost =
    await api.functional.economicForum.user.posts.create(connection, {
      body: prepared,
    });
  return result;
}
