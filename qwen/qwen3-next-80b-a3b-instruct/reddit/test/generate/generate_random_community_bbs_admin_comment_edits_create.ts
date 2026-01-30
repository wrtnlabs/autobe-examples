import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommentEdits } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentEdits";
import { prepare_random_community_bbs_comment_edits } from "../prepare/prepare_random_community_bbs_comment_edits";
export async function generate_random_community_bbs_admin_comment_edits_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsCommentEdits.ICreate>;
  },
): Promise<ICommunityBbsCommentEdits> {
  const prepared: ICommunityBbsCommentEdits.ICreate =
    prepare_random_community_bbs_comment_edits(props.body);
  const result: ICommunityBbsCommentEdits =
    await api.functional.communityBbs.admin.comment_edits.create(connection, {
      body: prepared,
    });
  return result;
}
