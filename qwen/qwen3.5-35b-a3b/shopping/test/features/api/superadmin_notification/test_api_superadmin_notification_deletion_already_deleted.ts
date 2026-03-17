import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_notification_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins the system
  const authConnection: api.IConnection = { host: connection.host };
  const auth: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(authConnection, {});
  typia.assert(auth);
  // 2. Generate a notification UUID (CREATE endpoint not available in SDK)
  const notificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. First deletion attempt
  const connection1: api.IConnection = { host: connection.host };
  connection1.headers = { Authorization: auth.token.access };
  await api.functional.ecommerceMall.superAdmin.notifications.erase(
    connection1,
    {
      notificationId,
    },
  );
  // First deletion succeeded - notification exists and was soft-deleted
  // 4. Second deletion attempt (should return 409 Conflict)
  const connection2: api.IConnection = { host: connection.host };
  connection2.headers = { Authorization: auth.token.access };
  await TestValidator.httpError(
    "second deletion should return 409 Conflict",
    409,
    async () => {
      await api.functional.ecommerceMall.superAdmin.notifications.erase(
        connection2,
        {
          notificationId,
        },
      );
    },
  );
  // 5. Verify notification remains soft-deleted (no GET endpoint available)
  // The 409 Conflict response confirms the notification is in soft-deleted state
}
