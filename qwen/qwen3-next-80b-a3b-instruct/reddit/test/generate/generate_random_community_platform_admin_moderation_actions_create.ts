import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { prepare_random_community_platform_moderation_action } from "../prepare/prepare_random_community_platform_moderation_action";
export async function generate_random_community_platform_admin_moderation_actions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformModerationAction.ICreate> | undefined;
  },
): Promise<ICommunityPlatformModerationAction> {
  const prepared: ICommunityPlatformModerationAction.ICreate =
    prepare_random_community_platform_moderation_action(props.body);
  const result: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.admin.moderation.actions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
