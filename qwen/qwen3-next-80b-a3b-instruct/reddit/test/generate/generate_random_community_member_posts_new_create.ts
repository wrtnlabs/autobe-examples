import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_post } from "../prepare/prepare_random_community_post";

export async function generate_random_community_member_posts_new_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPost.ICreate> | undefined;
  },
): Promise<ICommunityPost> {
  const prepared: ICommunityPost.ICreate = prepare_random_community_post(
    props.body,
  );
  return await api.functional.community.member.posts._new.create(connection, {
    body: prepared,
  });
}
