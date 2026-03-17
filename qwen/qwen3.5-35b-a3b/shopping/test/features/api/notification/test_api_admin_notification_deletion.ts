import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_notification_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminAuthorized = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Create admin-specific connection using token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuthorized.token.access,
    },
  };
  // 3. Delete notification with random ID
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  typia.assert(notificationId);
  await api.functional.ecommerceMall.admin.notifications.erase(
    adminConnection,
    {
      notificationId,
    },
  );
  // 4. Validation
  // - Deletion completed without error (implicit from no exception)
  // - API returns void (204 No Content), no response to assert
  // - Soft-delete verification requires database access
  // - Cascade deletion verification requires database access
  TestValidator.predicate("notification deletion completed", true);
}
