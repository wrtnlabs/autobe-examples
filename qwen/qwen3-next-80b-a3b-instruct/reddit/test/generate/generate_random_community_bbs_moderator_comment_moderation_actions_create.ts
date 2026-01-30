import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommentModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentModerationAction";
import { prepare_random_community_bbs_comment_moderation_action } from "../prepare/prepare_random_community_bbs_comment_moderation_action";
export async function generate_random_community_bbs_moderator_comment_moderation_actions_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityBbsCommentModerationAction.ICreate>
      | undefined;
  },
): Promise<ICommunityBbsCommentModerationAction> {
  const prepared: ICommunityBbsCommentModerationAction.ICreate =
    prepare_random_community_bbs_comment_moderation_action(props.body);
  return await api.functional.communityBbs.moderator.comment_moderation_actions.create(
    connection,
    {
      body: prepared,
    },
  );
}
