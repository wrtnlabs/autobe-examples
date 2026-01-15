import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationTemplate";
import type { IDiscussionBoardNotificationTemplateMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationTemplateMetadata";
export async function test_api_notification_template_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random valid UUID for the notification template
  const templateId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve the notification template using the generated ID
  const template: IDiscussionBoardNotificationTemplate =
    await api.functional.discussionBoard.notifications.templates.at(
      connection,
      {
        templateId,
      },
    );
  // Validate the retrieved template structure using typia.assert
  typia.assert(template);
  // Confirm that the returned template ID matches the requested template ID
  TestValidator.equals(
    "retrieved template ID matches requested ID",
    template.id,
    templateId,
  );
}
