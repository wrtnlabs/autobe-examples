import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_password_reset_with_unregistered_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to establish context
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Attempt password reset with unregistered email
  // The system must NOT return 404 (to prevent account enumeration)
  // Instead, it must generate a dummy reset token ID, store it in reset table (no associated user),
  // not send an email, and return 200 OK with the dummy token ID
  const unregisteredEmail = typia.random<string & tags.Format<"email">>();
  const response =
    await api.functional.shoppingMall.admin.reset_request.request(
      adminConnection,
      {
        body: {
          email: unregisteredEmail,
        } satisfies IShoppingMallCustomerPasswordReset,
      },
    );
  typia.assert(response);
  // 3. Validate response structure and behavior
  // Since the email is unregistered, server returns a dummy token ID
  // and the response body structure matches IShoppingMallCustomerPasswordReset
  TestValidator.equals(
    "email matches input",
    response.email,
    unregisteredEmail,
  );
  // The system must return 200 OK - no error should be thrown
  // This tests the defensive security design against account enumeration
}
