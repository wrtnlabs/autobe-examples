import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformFailedNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFailedNotification";
import type { ICommunityPlatformFailedNotificationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFailedNotificationMetadata";
import { prepare_random_community_platform_failed_notification } from "../prepare/prepare_random_community_platform_failed_notification";
export async function generate_random_community_platform_failed_notifications_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformFailedNotification.ICreate>
      | undefined;
  },
): Promise<ICommunityPlatformFailedNotification> {
  const prepared: ICommunityPlatformFailedNotification.ICreate =
    prepare_random_community_platform_failed_notification(props.body);
  return await api.functional.communityPlatform.failed_notifications.create(
    connection,
    {
      body: prepared,
    },
  );
}
