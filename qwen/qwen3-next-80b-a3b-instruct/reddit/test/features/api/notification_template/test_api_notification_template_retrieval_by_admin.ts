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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformNotificationTemplate";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_notification_template_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Test basic template retrieval with default parameters
  const basicResponse =
    await api.functional.communityPlatform.admin.notification_templates.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformNotificationTemplate.IRequest,
      },
    );
  typia.assert(basicResponse);
  // Validate response structure
  TestValidator.equals(
    "basic response: pagination present",
    basicResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "basic response: data present",
    Array.isArray(basicResponse.data),
    true,
  );
  // Validate pagination structure and values
  TestValidator.equals(
    "pagination: current page must be 1",
    basicResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: limit must be 20",
    basicResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination: records must be >= 0",
    () => basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination: pages must be >= 0",
    () => basicResponse.pagination.pages >= 0,
  );
  // Validate data structure - ensure all items are ISummary
  TestValidator.predicate("all data items are ISummary", () =>
    basicResponse.data.every(
      (template) =>
        typeof template.name === "string" &&
        typeof template.type === "string" &&
        typeof template.category === "string" &&
        typeof template.subject === "string" &&
        typeof template.content === "string" &&
        ["active", "inactive", "draft", null].includes(template.status) &&
        typeof template.created_at === "string",
    ),
  );
  // Validate that template properties have appropriate length constraints
  TestValidator.predicate("all template names have length >= 1", () =>
    basicResponse.data.every((template) => template.name.length >= 1),
  );
  TestValidator.predicate("all template names have length <= 100", () =>
    basicResponse.data.every((template) => template.name.length <= 100),
  );
  TestValidator.predicate("all template subjects have length >= 1", () =>
    basicResponse.data.every((template) => template.subject.length >= 1),
  );
  TestValidator.predicate("all template subjects have length <= 200", () =>
    basicResponse.data.every((template) => template.subject.length <= 200),
  );
  // Validate that types are from allowed list
  const allowedTypes = ["email", "sms", "push", "in_app", "whatsapp"];
  TestValidator.predicate("all template types are valid", () =>
    basicResponse.data.every((template) =>
      allowedTypes.includes(template.type),
    ),
  );
  // Validate that statuses are from allowed list
  const allowedStatuses = ["active", "inactive", "draft", null];
  TestValidator.predicate("all template statuses are valid", () =>
    basicResponse.data.every((template) =>
      allowedStatuses.includes(template.status),
    ),
  );
  // Validate created_at is in ISO 8601 format
  TestValidator.predicate("all created_at are valid date-time format", () =>
    basicResponse.data.every((template) =>
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})/.test(
        template.created_at,
      ),
    ),
  );
  // Test retrieval with search term
  // Use a random string for search that might match existing templates (no guarantee they exist)
  const searchTerm = RandomGenerator.alphaNumeric(4).toLowerCase();
  const searchResponse =
    await api.functional.communityPlatform.admin.notification_templates.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: searchTerm,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformNotificationTemplate.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Test retrieval with category filter
  const category = RandomGenerator.pick([
    "user_registration",
    "account_verification",
    "order_confirmation",
    "shipment_notification",
    "security_alert",
    "promotion",
    "system_update",
    "payment",
    "billing",
    "membership",
    "community",
    "moderation",
    "support",
    "feedback",
  ] as const);
  const categoryResponse =
    await api.functional.communityPlatform.admin.notification_templates.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          category: [category],
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformNotificationTemplate.IRequest,
      },
    );
  typia.assert(categoryResponse);
  // Test retrieval with type filter
  const filterType = RandomGenerator.pick([
    "email",
    "sms",
    "push",
    "in_app",
    "whatsapp",
  ] as const);
  const typeResponse =
    await api.functional.communityPlatform.admin.notification_templates.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          type: [filterType],
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformNotificationTemplate.IRequest,
      },
    );
  typia.assert(typeResponse);
  // Test sorting by created_at (descending)
  const sortCreatedAtResponse =
    await api.functional.communityPlatform.admin.notification_templates.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformNotificationTemplate.IRequest,
      },
    );
  typia.assert(sortCreatedAtResponse);
  // Test sorting by name (ascending)
  const sortNameResponse =
    await api.functional.communityPlatform.admin.notification_templates.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "name",
          order: "asc",
        } satisfies ICommunityPlatformNotificationTemplate.IRequest,
      },
    );
  typia.assert(sortNameResponse);
  // Test with maximum limit
  const maxLimitResponse =
    await api.functional.communityPlatform.admin.notification_templates.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformNotificationTemplate.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit: limit is 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit: data count <= 100",
    () => maxLimitResponse.data.length <= 100,
  );
  // Test with minimum page (page=1)
  const minPageResponse =
    await api.functional.communityPlatform.admin.notification_templates.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformNotificationTemplate.IRequest,
      },
    );
  typia.assert(minPageResponse);
  TestValidator.equals(
    "min page: current page is 1",
    minPageResponse.pagination.current,
    1,
  );
}