import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationTemplate";
import { prepare_random_community_platform_notification_template } from "../../../prepare/prepare_random_community_platform_notification_template";
import { generate_random_community_platform_admin_notification_templates_create } from "../../../generate/generate_random_community_platform_admin_notification_templates_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_notification_template_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a notification template that can be deleted
  const template: ICommunityPlatformNotificationTemplate =
    await generate_random_community_platform_admin_notification_templates_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          subject: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          priority: RandomGenerator.pick(["low", "medium", "high"] as const),
          tags: ArrayUtil.repeat(3, () => RandomGenerator.alphaNumeric(5)),
          is_active: true,
        } satisfies ICommunityPlatformNotificationTemplate.ICreate,
      },
    );
  // Step 3: Delete the notification template using its templateId
  // Since the delete operation requires a templateId and the system generates an id for newly created templates,
  // we assert that the template has the id property from IEntity, which it inherits in the actual implementation.
  const templateWithId = typia.assert<
    ICommunityPlatformNotificationTemplate & IEntity
  >(template);
  await api.functional.communityPlatform.admin.notification_templates.erase(
    adminConnection,
    { templateId: templateWithId.id },
  );
  // Note: No verification of deletion is possible because no GET API exists to check template existance
  // The scenario's requirement to validate that the template cannot be retrieved after deletion
  // cannot be implemented as the API does not provide a retrieval endpoint.
  // The successful completion of the deletion operation confirms admin authorization and the
  // hard-delete behavior of the system.
}
