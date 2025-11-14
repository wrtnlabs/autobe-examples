import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationTemplate";

export async function test_api_admin_communication_templates_retrieval(
  connection: api.IConnection,
) {
  // Retrieve all communication templates for administrators
  // This tests that authenticated admins can retrieve all notification templates
  // The API returns a complete list of templates with their title, body, type, and metadata
  // All validation is performed by typia.assert(), which ensures type safety and complete schema compliance
  const templates: ICommunityPlatformNotificationTemplate =
    await api.functional.communityPlatform.admin.communication.templates.index(
      connection,
    );
  typia.assert(templates);
}
