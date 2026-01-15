import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformEmailNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEmailNotificationQueue";
import { prepare_random_community_platform_email_notification_queue } from "../prepare/prepare_random_community_platform_email_notification_queue";
export async function generate_random_community_platform_admin_email_notification_queue_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformEmailNotificationQueue.ICreate>
      | undefined;
  },
): Promise<ICommunityPlatformEmailNotificationQueue> {
  const prepared: ICommunityPlatformEmailNotificationQueue.ICreate =
    prepare_random_community_platform_email_notification_queue(props.body);
  return await api.functional.communityPlatform.admin.email_notification_queue.create(
    connection,
    {
      body: prepared,
    },
  );
}
