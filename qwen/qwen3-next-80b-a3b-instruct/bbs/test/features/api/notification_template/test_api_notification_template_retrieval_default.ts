import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationTemplate";
import type { IDiscussionBoardNotificationTemplateMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationTemplateMetadata";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotificationTemplate";
export async function test_api_notification_template_retrieval_default(
  connection: api.IConnection,
): Promise<void> {
  // Create base connection for unauthenticated access
  const guestConnection: api.IConnection = { host: connection.host };
  // Retrieve all notification templates using the default parameters
  // This should return a paginated list of all active templates
  const response: IPageIDiscussionBoardNotificationTemplate =
    await api.functional.discussionBoard.notifications.templates.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardNotificationTemplate.IRequest,
      },
    );
  // Validate the response structure and types with typia.assert
  // This performs complete validation of all fields and their types
  typia.assert(response);
  // Verify pagination properties
  TestValidator.equals(
    "page number should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 100", response.pagination.limit, 100);
  TestValidator.predicate(
    "total records should be greater than or equal to 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be greater than or equal to 0",
    response.pagination.pages >= 0,
  );
  // Verify that data array exists and has items
  TestValidator.predicate(
    "data array should not be empty",
    response.data.length > 0,
  );
  // Validate each template in the response
  for (const template of response.data) {
    // Basic field validation (typia.assert already validates types and format)
    // We only check business logic and optional field existence
    // Validate event_type is one of the allowed string literals
    TestValidator.predicate(
      "event_type should be user_engagement, moderation_action, or system_event",
      template.event_type === "user_engagement" ||
        template.event_type === "moderation_action" ||
        template.event_type === "system_event",
    );
    // Validate delivery channels have the right number of items
    TestValidator.predicate(
      "delivery_channels should have 1-4 items",
      template.delivery_channels.length >= 1 &&
        template.delivery_channels.length <= 4,
    );
    // Validate delivery channel values are from allowed set
    for (const channel of template.delivery_channels) {
      TestValidator.predicate(
        "delivery channel must be one of: in_app, email, push, sms",
        channel === "in_app" ||
          channel === "email" ||
          channel === "push" ||
          channel === "sms",
      );
    }
    // Validate placeholders if they exist (optional field)
    if (template.placeholders !== undefined) {
      TestValidator.predicate(
        "placeholders array length must be 20 or less",
        template.placeholders.length <= 20,
      );
    }
    // Validate metadata if it exists (optional field)
    if (template.metadata !== undefined) {
      // Metadata is defined as string type, no need to parse
      TestValidator.predicate(
        "metadata should be a string",
        typeof template.metadata === "string",
      );
    }
  }
}
