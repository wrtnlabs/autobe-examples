import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformWebhook";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_platform_admin_webhooks_create } from "../../../generate/generate_random_reddit_platform_admin_webhooks_create";
import { prepare_random_reddit_platform_webhook } from "../../../prepare/prepare_random_reddit_platform_webhook";

/**
 * Test webhook endpoint creation workflow.
 * 1. Admin registers account
 * 2. Admin logs in
 * 3. Admin creates webhook endpoint
 * 4. Validate webhook response
 */
export async function test_api_webhook_admin_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const registeredPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: registeredPassword,
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Admin login
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoinResult.email,
      password: registeredPassword,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  typia.assert(adminLoginResult);
  // 3. Webhook creation
  const endpointUrl = "https://api.example.com/webhooks/receiver";
  const eventTypes: string[] = ["post.created", "comment.created"];
  const webhookResult =
    await generate_random_reddit_platform_admin_webhooks_create(
      adminLoginConnection,
      {
        body: {
          endpointUrl,
          eventTypes,
        },
      },
    );
  typia.assert<IRedditPlatformWebhook.ICreate>(webhookResult);
  // 4. Validate webhook response
  TestValidator.equals(
    "endpoint URL matches",
    webhookResult.endpointUrl,
    endpointUrl,
  );
  TestValidator.equals(
    "event types match",
    webhookResult.eventTypes,
    eventTypes,
  );
}
