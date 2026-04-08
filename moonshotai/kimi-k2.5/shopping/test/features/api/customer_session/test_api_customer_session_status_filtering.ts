import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test customer session status filtering functionality.
 * Super administrator filters customer sessions by expiration status to audit
 * active and expired sessions separately. Verify that status filters work
 * correctly and the computed isActive field reflects actual session state.
 */
export async function test_api_customer_session_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Test filtering with status = 'active'
  const activeResult =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeResult);
  // Validate all returned sessions are active
  TestValidator.predicate(
    "all filtered 'active' sessions have isActive = true",
    activeResult.data.every((session) => session.isActive === true),
  );
  // 3. Test filtering with status = 'expired'
  const expiredResult =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      {
        body: {
          status: "expired",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(expiredResult);
  // Validate all returned sessions are expired
  TestValidator.predicate(
    "all filtered 'expired' sessions have isActive = false",
    expiredResult.data.every((session) => session.isActive === false),
  );
  // 4. Test filtering with status = 'all'
  const allResult =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      {
        body: {
          status: "all",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(allResult);
  // For 'all', we should have data consistent with individual filters
  // (total should match if no other filters applied)
  TestValidator.predicate(
    "'all' result contains combined data count",
    allResult.pagination.records >=
      Math.min(
        activeResult.pagination.records,
        expiredResult.pagination.records,
      ),
  );
  // 5. Test date range filtering with createdAtFrom/createdAtTo
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      {
        body: {
          status: "all",
          createdAtFrom: yesterday.toISOString(),
          createdAtTo: tomorrow.toISOString(),
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate createdAt falls within specified range
  TestValidator.predicate(
    "all filtered sessions have createdAt within date range",
    dateRangeResult.data.every(
      (session) =>
        new Date(session.createdAt) >= yesterday &&
        new Date(session.createdAt) <= tomorrow,
    ),
  );
  // 6. Cross-validate isActive field consistency with expiredAt
  // If isActive is true, expiredAt should be in the future
  // If isActive is false, expiredAt should be in the past or present
  const validateIsActiveConsistency = (
    session: IEcommerceMallCustomerSession.ISummary,
  ): boolean => {
    if (session.isActive) {
      return session.expiredAt !== null && new Date(session.expiredAt) > now;
    } else {
      return session.expiredAt === null || new Date(session.expiredAt) <= now;
    }
  };
  TestValidator.predicate(
    "isActive field is consistent with expiredAt timestamp",
    [
      ...activeResult.data,
      ...expiredResult.data,
      ...dateRangeResult.data,
    ].every(validateIsActiveConsistency),
  );
}
