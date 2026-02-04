import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_moderation_action } from "../prepare/prepare_random_community_platform_moderation_action";

export async function generate_random_community_platform_user_moderation_actions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformModerationAction.ICreate>;
  },
): Promise<ICommunityPlatformModerationAction> {
  const prepared: ICommunityPlatformModerationAction.ICreate =
    prepare_random_community_platform_moderation_action(props.body);
  const result: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.user.moderation_actions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
