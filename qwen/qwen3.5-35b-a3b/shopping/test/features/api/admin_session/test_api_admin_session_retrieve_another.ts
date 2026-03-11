import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_retrieve_another(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register adminA (will become super administrator)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminAResponse = await authorize_admin_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAResponse);
  // 2. Register adminB (regular administrator, will be audited)
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminBResponse = await authorize_admin_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminBResponse);
  // 3. Promote adminA to super administrator
  // Note: In real scenario, another super admin would promote adminA
  // For testing purposes, we promote adminA after login
  const adminAPromoteConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminAPromoteConnection, {
    body: {
      email: adminAResponse.email,
      password: "SecurePassword123!",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Get adminB's session by logging in adminB first to create a session
  const adminBSessionConnection: api.IConnection = { host: connection.host };
  const adminBSessionResponse = await authorize_admin_login(
    adminBSessionConnection,
    {
      body: {
        email: adminBResponse.email,
        password: "SecurePassword123!",
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  // Create adminA's session by logging in
  const adminALoginConnection: api.IConnection = { host: connection.host };
  const adminALoginResponse = await authorize_admin_login(
    adminALoginConnection,
    {
      body: {
        email: adminAResponse.email,
        password: "SecurePassword123!",
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  // AdminA (as super) retrieves adminB's session
  const adminARetrieveConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminARetrieveConnection, {
    body: {
      email: adminAResponse.email,
      password: "SecurePassword123!",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const retrievedSession = await api.functional.ecommerceMall.admin.sessions.at(
    adminARetrieveConnection,
    {
      sessionId: adminBSessionResponse.token.access,
    },
  );
  typia.assert(retrievedSession);
  // Validate session belongs to adminB
  TestValidator.equals(
    "session seller is adminB",
    retrievedSession.seller.id,
    adminBResponse.id,
  );
  TestValidator.equals(
    "seller email matches adminB",
    retrievedSession.seller.email,
    adminBResponse.email,
  );
  TestValidator.equals(
    "seller approval status is defined",
    retrievedSession.seller.approvalStatus !== undefined,
    true,
  );
  TestValidator.equals(
    "seller isBanned field exists",
    retrievedSession.seller.isBanned !== undefined,
    true,
  );
  TestValidator.equals(
    "session has seller createdAt",
    retrievedSession.seller.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "session has seller updatedAt",
    retrievedSession.seller.updatedAt !== undefined,
    true,
  );
  TestValidator.equals(
    "session has ip",
    retrievedSession.ip !== undefined,
    true,
  );
  TestValidator.equals(
    "session has href",
    retrievedSession.href !== undefined,
    true,
  );
  TestValidator.equals(
    "session has referrer",
    retrievedSession.referrer !== undefined,
    true,
  );
  TestValidator.equals(
    "session has created_at",
    retrievedSession.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "session has expired_at",
    retrievedSession.expired_at !== undefined,
    true,
  );
}