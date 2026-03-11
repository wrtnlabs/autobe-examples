import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_admin_role_view_unauthorized_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and test unauthorized access
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Attempt to access admin role endpoint as customer (should fail)
  const nonExistentRoleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("customer cannot access admin role", async () => {
    await api.functional.ecommerceMall.admin.admin_roles.at(
      customerConnection,
      {
        adminRoleId: nonExistentRoleId,
      },
    );
  });
  // 3. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 4. Login as admin
  await authorize_admin_login(adminConnection, {
    body: {
      email: "",
      password: "",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 5. Test access to non-existent role ID (should return 404)
  await TestValidator.error("non-existent role ID should fail", async () => {
    await api.functional.ecommerceMall.admin.admin_roles.at(adminConnection, {
      adminRoleId: nonExistentRoleId,
    });
  });
}