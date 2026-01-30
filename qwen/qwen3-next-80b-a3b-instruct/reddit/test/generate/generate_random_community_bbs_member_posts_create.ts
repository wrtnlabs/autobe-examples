import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { prepare_random_community_bbs_post } from "../prepare/prepare_random_community_bbs_post";
export async function generate_random_community_bbs_member_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsPost.ICreate>;
  },
): Promise<ICommunityBbsPost> {
  const prepared: ICommunityBbsPost.ICreate = prepare_random_community_bbs_post(
    props.body,
  );
  const result: ICommunityBbsPost =
    await api.functional.communityBbs.member.posts.create(connection, {
      body: prepared,
    });
  return result;
}
