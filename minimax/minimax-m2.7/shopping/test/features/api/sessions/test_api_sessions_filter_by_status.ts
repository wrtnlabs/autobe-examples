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

export async function test_api_sessions_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin to access session management
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  // 2. Query sessions with status='active' filter
  const activeSessionsResponse =
    await api.functional.ecommerceMall.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeSessionsResponse);
  // 3. Verify all active sessions have isActive=true and expiredAt > current time
  const currentTime = new Date();
  for (const session of activeSessionsResponse.data) {
    TestValidator.equals(
      "session isActive should be true for active status",
      session.isActive,
      true,
    );
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate(
      "expiredAt should be greater than current time for active session",
      expiredAt.getTime() > currentTime.getTime(),
    );
  }
  // 4. Query sessions with status='expired' filter
  const expiredSessionsResponse =
    await api.functional.ecommerceMall.superAdmin.sessions.index(
      superAdminConnection,
      {
        body: {
          status: "expired",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(expiredSessionsResponse);
  // 5. Verify all expired sessions have isActive=false and expiredAt <= current time
  for (const session of expiredSessionsResponse.data) {
    TestValidator.equals(
      "session isActive should be false for expired status",
      session.isActive,
      false,
    );
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate(
      "expiredAt should be less than or equal to current time for expired session",
      expiredAt.getTime() <= currentTime.getTime(),
    );
  }
}
