import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_email_resend_unauthenticated(
  connection: api.IConnection,
): Promise<void> {
  // Create an unauthenticated connection (empty headers)
  const unauthConnection: api.IConnection = { host: connection.host };
  // Test: Resend email without authentication should fail with 401
  await TestValidator.error(
    "unauthenticated email resend should return 401 unauthorized",
    async () => {
      await api.functional.shoppingMall.admin.auth.admins.email.resend(
        unauthConnection,
      );
    },
  );
}
