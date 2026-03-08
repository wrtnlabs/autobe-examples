import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformWebhookEndpoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformWebhookEndpoint";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformWebhookEndpoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformWebhookEndpoint";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_webhooks_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with authorization token
  const adminListConnection: api.IConnection = { host: connection.host };
  adminListConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 3. List webhook endpoints with default pagination
  const response = await api.functional.redditPlatform.admin.webhooks.index(
    adminListConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformWebhookEndpoint.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination pages calculation",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 5. Validate webhook items structure
  TestValidator.equals(
    "webhook items count matches page limit",
    response.data.length <= response.pagination.limit,
    true,
  );
  // 6. Validate each webhook entry
  for (let i = 0; i < response.data.length; i++) {
    const webhook = response.data[i];
    typia.assert(webhook);
    // Required fields validation - type safe
    TestValidator.equals(
      `webhook ${i} has name`,
      typeof webhook.name === "string",
      true,
    );
    TestValidator.equals(
      `webhook ${i} has url`,
      typeof webhook.url === "string",
      true,
    );
    TestValidator.equals(
      `webhook ${i} has eventTypes`,
      Array.isArray(webhook.eventTypes),
      true,
    );
    TestValidator.equals(
      `webhook ${i} has at least 1 event type`,
      webhook.eventTypes.length >= 1,
      true,
    );
    TestValidator.equals(
      `webhook ${i} status is valid`,
      ["active", "inactive", "paused", "failed"].includes(webhook.status),
      true,
    );
    TestValidator.equals(
      `webhook ${i} has createdAt`,
      typeof webhook.createdAt === "string",
      true,
    );
    TestValidator.equals(
      `webhook ${i} has updatedAt`,
      typeof webhook.updatedAt === "string",
      true,
    );
    TestValidator.equals(
      `webhook ${i} has createdByAdmin`,
      typeof webhook.createdByAdmin === "object" &&
        webhook.createdByAdmin !== null,
      true,
    );
    // 7. Validate createdByAdmin structure
    TestValidator.equals(
      `webhook ${i} createdByAdmin has id`,
      typeof webhook.createdByAdmin.id === "string",
      true,
    );
    TestValidator.equals(
      `webhook ${i} createdByAdmin has username`,
      typeof webhook.createdByAdmin.username === "string",
      true,
    );
    // 8. Validate sensitive fields are NOT included
    TestValidator.equals(
      `webhook ${i} has no secret_key field`,
      "secret_key" in webhook,
      false,
    );
    TestValidator.equals(
      `webhook ${i} has no authorization_header field`,
      "authorization_header" in webhook,
      false,
    );
  }
  // 9. Validate UUID format and datetime format using typia assertGuard
  if (response.data.length > 0) {
    typia.assertGuard(response.data[0].id);
    typia.assertGuard(response.data[0].createdAt);
    typia.assertGuard(response.data[0].updatedAt);
    typia.assertGuard(response.data[0].createdByAdmin.id);
  }
}
