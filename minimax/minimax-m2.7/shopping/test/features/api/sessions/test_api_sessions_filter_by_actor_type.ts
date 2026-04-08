import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_sessions_filter_by_actor_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin to access session management
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Test fetching sessions without actorType filter
  const sessionResponse =
    await api.functional.ecommerceMall.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          limit: 20,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionResponse);
  // 3. Verify pagination structure exists
  TestValidator.equals(
    "pagination exists",
    sessionResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "has pagination data",
    sessionResponse.pagination.data !== null,
  );
  // 4. If sessions exist, verify they all match the expected structure
  if (sessionResponse.data.length > 0) {
    for (const session of sessionResponse.data) {
      // Verify each session has the expected structure
      TestValidator.equals(
        "session has id",
        typeof session.id === "string",
        true,
      );
      TestValidator.equals(
        "session has customer",
        session.customer !== null,
        true,
      );
      TestValidator.equals(
        "session customer has email",
        typeof session.customer.email === "string",
        true,
      );
      // Verify isActive is a boolean
      TestValidator.equals(
        "session isActive is boolean",
        typeof session.isActive === "boolean",
        true,
      );
    }
  }
  // 5. Verify pagination metadata is valid using IPage properties
  TestValidator.predicate(
    "pagination has expected structure",
    sessionResponse.pagination !== null && 
    sessionResponse.pagination.data !== null,
  );
  // 6. Test combining status filter
  const activeCustomerSessions =
    await api.functional.ecommerceMall.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          status: "active",
          limit: 10,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeCustomerSessions);
  // 7. Verify all returned sessions are active
  for (const session of activeCustomerSessions.data) {
    TestValidator.predicate(
      "session is active",
      session.isActive === true,
    );
  }
  // 8. Test with pagination
  const paginatedResponse =
    await api.functional.ecommerceMall.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination response exists",
    paginatedResponse.pagination !== null,
    true,
  );
}