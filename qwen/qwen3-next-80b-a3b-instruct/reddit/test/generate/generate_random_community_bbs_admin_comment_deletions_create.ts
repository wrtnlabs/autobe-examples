import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentDeletion";
import { prepare_random_community_bbs_comment_deletion } from "../prepare/prepare_random_community_bbs_comment_deletion";
export async function generate_random_community_bbs_admin_comment_deletions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsCommentDeletion.ICreate>;
  },
): Promise<void> {
  const prepared: ICommunityBbsCommentDeletion.ICreate =
    prepare_random_community_bbs_comment_deletion(props.body);
  return await api.functional.communityBbs.admin.comment_deletions.create(
    connection,
    {
      body: prepared,
    },
  );
}
