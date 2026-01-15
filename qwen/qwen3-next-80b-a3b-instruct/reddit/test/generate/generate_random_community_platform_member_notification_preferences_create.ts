import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserNotificationPreference";
import { prepare_random_community_platform_user_notification_preference } from "../prepare/prepare_random_community_platform_user_notification_preference";
export async function generate_random_community_platform_member_notification_preferences_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformUserNotificationPreference.ICreate>
      | undefined;
  },
): Promise<ICommunityPlatformUserNotificationPreference> {
  const prepared: ICommunityPlatformUserNotificationPreference.ICreate =
    prepare_random_community_platform_user_notification_preference(props.body);
  return await api.functional.communityPlatform.member.notification_preferences.create(
    connection,
    {
      body: prepared,
    },
  );
}
