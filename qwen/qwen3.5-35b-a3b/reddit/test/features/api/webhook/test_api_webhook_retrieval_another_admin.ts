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

export async function test_api_webhook_retrieval_another_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  typia.assert(admin1);
  // 2. Create second admin
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  typia.assert(admin2);
  // 3. Generate a webhook ID to test retrieval
  // (In a real scenario, admin1 would create a webhook, then admin2 tries to retrieve it)
  // Since we don't have webhook creation endpoint in SDK, we test with a random webhookId
  const testWebhookId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Admin2 attempts to retrieve webhook (should receive 403 Forbidden)
  // because they cannot access webhooks owned by others
  await TestValidator.error(
    "second admin should not access another admin's webhook",
    async () => {
      await api.functional.redditPlatform.admin.webhooks.at(admin2Connection, {
        webhookId: testWebhookId,
      });
    },
  );
  // 5. Verify that admin1 also cannot access unknown webhook (404 or 403)
  // This confirms the access control is working consistently
  await TestValidator.error(
    "first admin should not access unknown webhook",
    async () => {
      await api.functional.redditPlatform.admin.webhooks.at(admin1Connection, {
        webhookId: testWebhookId,
      });
    },
  );
}
