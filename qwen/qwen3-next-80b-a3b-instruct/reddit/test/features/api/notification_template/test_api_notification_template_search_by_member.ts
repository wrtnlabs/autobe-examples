import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationTemplate";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformNotificationTemplate";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_notification_template_search_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate member using utility function
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // memberConnection.headers is updated internally by authorize function
  // Step 3: Create search parameters with default values (page=1, limit=20)
  const searchParams: ICommunityPlatformNotificationTemplate.IRequest = {
    page: 1,
    limit: 20,
    sort_by: "created_at",
    order: "desc",
  } satisfies ICommunityPlatformNotificationTemplate.IRequest;
  // Step 4: Call the API endpoint with member-specific connection
  const result: IPageICommunityPlatformNotificationTemplate.ISummary =
    await api.functional.communityPlatform.member.notification_templates.index(
      memberConnection,
      { body: searchParams },
    );
  // Step 5: Validate response structure
  typia.assert(result);
  // Step 6: Validate pagination metadata
  TestValidator.equals("page should be 1", result.pagination.current, 1);
  TestValidator.equals("limit should be 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "records should be >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pages should be >= 0", result.pagination.pages >= 0);
  // Step 7: Validate that each template contains only summary fields
  for (const template of result.data) {
    // Verify summary fields exist and are properly typed
    TestValidator.equals(
      "template name should be string",
      typeof template.name,
      "string",
    );
    TestValidator.predicate(
      "template name should have length > 0",
      template.name.length > 0,
    );
    TestValidator.equals(
      "template type should be string",
      typeof template.type,
      "string",
    );
    TestValidator.predicate(
      "template type should not be empty",
      template.type.length > 0,
    );
    TestValidator.equals(
      "template category should be string",
      typeof template.category,
      "string",
    );
    TestValidator.predicate(
      "template category should not be empty",
      template.category.length > 0,
    );
    TestValidator.equals(
      "template subject should be string",
      typeof template.subject,
      "string",
    );
    TestValidator.predicate(
      "template subject should have length > 0",
      template.subject.length > 0,
    );
    TestValidator.equals(
      "template status should be one of 'active', 'inactive', 'draft', or null",
      ["active", "inactive", "draft", null].includes(template.status),
      true,
    );
    TestValidator.equals(
      "template created_at should be ISO 8601 string",
      typeof template.created_at,
      "string",
    );
  }
}
