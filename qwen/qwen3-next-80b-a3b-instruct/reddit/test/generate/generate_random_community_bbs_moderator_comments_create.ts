import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { prepare_random_community_bbs_comment } from "../prepare/prepare_random_community_bbs_comment";
export async function generate_random_community_bbs_moderator_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsComment.ICreate>;
  },
): Promise<ICommunityBbsComment> {
  const prepared: ICommunityBbsComment.ICreate =
    prepare_random_community_bbs_comment(props.body);
  const result: ICommunityBbsComment =
    await api.functional.communityBbs.moderator.comments.create(connection, {
      body: prepared,
    });
  return result;
}
