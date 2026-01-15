import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationTemplate";
import { prepare_random_community_platform_notification_template } from "../prepare/prepare_random_community_platform_notification_template";
export async function generate_random_community_platform_admin_notification_templates_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformNotificationTemplate.ICreate>;
  },
): Promise<ICommunityPlatformNotificationTemplate> {
  const prepared: ICommunityPlatformNotificationTemplate.ICreate =
    prepare_random_community_platform_notification_template(props.body);
  return await api.functional.communityPlatform.admin.notification_templates.create(
    connection,
    {
      body: prepared,
    },
  );
}
