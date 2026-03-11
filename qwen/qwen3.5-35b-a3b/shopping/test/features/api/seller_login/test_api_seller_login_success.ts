import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string>(),
      password: "SecurePass123!@#",
      href: typia.random<string>(),
      referrer: typia.random<string>(),
      ip: typia.random<string>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create seller account (will be pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string>();
  const sellerPassword = "SecurePass123!@#";
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string>(),
      referrer: typia.random<string>(),
      ip: typia.random<string>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Attempt seller login - will fail because account is pending
  await TestValidator.error("login fails for pending approval", async () => {
    await authorize_seller_login(sellerConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    });
  });
  // 4. Create a new seller for approved status test (if auto-approved)
  const sellerConnection2: api.IConnection = { host: connection.host };
  const sellerEmail2 = typia.random<string>();
  const sellerPassword2 = "SecurePass123!@#";
  await authorize_seller_join(sellerConnection2, {
    body: {
      email: sellerEmail2,
      password: sellerPassword2,
      href: typia.random<string>(),
      referrer: typia.random<string>(),
      ip: typia.random<string>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 5. Attempt login with second seller - test that login works with approved status
  const loginResult = await authorize_seller_login(sellerConnection2, {
    body: {
      email: sellerEmail2,
      password: sellerPassword2,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // 6. Validate login response
  TestValidator.equals(
    "email matches login request",
    loginResult.email,
    sellerEmail2,
  );
  TestValidator.equals(
    "approval status is approved",
    loginResult.approval_status,
    "approved",
  );
  TestValidator.predicate(
    "is_banned is false",
    loginResult.is_banned === false,
  );
  TestValidator.predicate(
    "is_suspended is false",
    loginResult.is_suspended === false,
  );
  TestValidator.predicate(
    "has valid access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expired_at is in future",
    new Date(loginResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    new Date(loginResult.token.refreshable_until) > new Date(),
  );
}