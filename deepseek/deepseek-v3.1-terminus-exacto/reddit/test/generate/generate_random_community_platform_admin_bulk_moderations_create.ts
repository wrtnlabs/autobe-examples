import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_moderation_queue } from "../prepare/prepare_random_community_platform_moderation_queue";

export async function generate_random_community_platform_admin_bulk_moderations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformModerationQueue.ICreate> | undefined;
  },
): Promise<ICommunityPlatformModerationQueue> {
  const prepared: ICommunityPlatformModerationQueue.ICreate =
    prepare_random_community_platform_moderation_queue(props.body);
  const result: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.bulk.moderations.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
