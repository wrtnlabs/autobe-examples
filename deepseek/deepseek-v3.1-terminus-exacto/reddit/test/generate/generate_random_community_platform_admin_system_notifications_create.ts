import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_system_notification } from "../prepare/prepare_random_community_platform_system_notification";

export async function generate_random_community_platform_admin_system_notifications_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformSystemNotification.ICreate>
      | undefined;
  },
): Promise<ICommunityPlatformSystemNotification> {
  const prepared: ICommunityPlatformSystemNotification.ICreate =
    prepare_random_community_platform_system_notification(props.body);
  return await api.functional.communityPlatform.admin.system_notifications.create(
    connection,
    {
      body: prepared,
    },
  );
}
