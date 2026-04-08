import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

interface IPaginationData {
  current: number;
  limit: number;
  records: number;
  pages: number;
}

export async function test_api_admin_sessions_list_all_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Admin joins to get authenticated
  const superAdminConnection1: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(
    superAdminConnection1,
    {},
  );
  typia.assert(superAdmin);
  // 2. Login as super admin again to create multiple sessions
  const superAdminConnection2: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection2, {
    body: {
      email: superAdmin.email,
      password: "TestPassword123!",
    },
  });
  // 3. Login again for additional sessions
  const superAdminConnection3: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection3, {
    body: {
      email: superAdmin.email,
      password: "TestPassword123!",
    },
  });
  // 4. Get sessions for the super admin (super admins are also admins in the system)
  // First, we need to get the admin ID from the super admin
  // Since super admin sessions are stored separately, we need an admin account
  // Let's create an admin by using the admin request flow and then approve manually
  // Create admin through request submission (this creates a customer/seller with pending admin request)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthResult =
    await api.functional.ecommerceMall.auth.admin.request.join(
      customerConnection,
      {
        body: {
          actorType: "customer",
          requestedGrade: "admin",
          reason: RandomGenerator.paragraph({ sentences: 5 }),
          href: "https://example.com/admin/request",
          referrer: "https://example.com/",
        },
      },
    );
  typia.assert(customerAuthResult);
  // 5. Login as admin (this will work since admin request creates the admin account)
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await api.functional.ecommerceMall.auth.admin.login(
    adminLoginConnection,
    {
      body: {
        email: customerAuthResult.email,
        password: "TestPassword123!",
        href: "https://example.com/admin/dashboard",
        referrer: "https://example.com/",
      },
    },
  );
  typia.assert(adminLoginResult);
  // 6. Login again to create additional sessions
  const adminLoginConnection2: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.login(adminLoginConnection2, {
    body: {
      email: customerAuthResult.email,
      password: "TestPassword123!",
      href: "https://example.com/admin/orders",
      referrer: "https://example.com/admin/dashboard",
    },
  });
  // 7. Login again for more sessions
  const adminLoginConnection3: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.login(adminLoginConnection3, {
    body: {
      email: customerAuthResult.email,
      password: "TestPassword123!",
      href: "https://example.com/admin/products",
      referrer: "https://example.com/admin/orders",
    },
  });
  // 8. Super admin retrieves paginated sessions for the admin
  const sessionsConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(sessionsConnection, {
    body: {
      email: superAdmin.email,
      password: "TestPassword123!",
    },
  });
  // 9. Get sessions with pagination (page 1, limit 10)
  const sessionsPage1 =
    await api.functional.ecommerceMall.superAdmin.admins.sessions.index(
      sessionsConnection,
      {
        adminId: adminLoginResult.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminSession.IRequest,
      },
    );
  typia.assert(sessionsPage1);
  const pagination1 = sessionsPage1.pagination as unknown as IPaginationData | null;
  // 10. Validate pagination metadata
  TestValidator.equals(
    "page 1 has pagination metadata",
    pagination1 !== null,
    true,
  );
  if (pagination1) {
    TestValidator.equals("current page is 1", pagination1.current, 1);
    TestValidator.equals("limit is 10", pagination1.limit, 10);
    TestValidator.predicate(
      "records count is non-negative",
      pagination1.records >= 0,
    );
    TestValidator.predicate(
      "pages count is non-negative",
      pagination1.pages >= 0,
    );
  }
  // 11. Validate sessions data structure
  TestValidator.predicate("has data array", Array.isArray(sessionsPage1.data));
  // If there are sessions, validate business logic
  if (sessionsPage1.data.length > 0) {
    // Validate that all sessions belong to the specified admin
    for (const session of sessionsPage1.data) {
      TestValidator.equals(
        "session belongs to correct admin",
        session.admin.id,
        adminLoginResult.id,
      );
    }
    // Validate ordering (newest first - created_at descending)
    if (sessionsPage1.data.length > 1) {
      for (let i = 0; i < sessionsPage1.data.length - 1; i++) {
        const current = new Date(sessionsPage1.data[i].createdAt).getTime();
        const next = new Date(sessionsPage1.data[i + 1].createdAt).getTime();
        TestValidator.predicate(
          "sessions ordered by createdAt descending",
          current >= next,
        );
      }
    }
  }
  // 12. Test pagination - request page 2
  const sessionsPage2 =
    await api.functional.ecommerceMall.superAdmin.admins.sessions.index(
      sessionsConnection,
      {
        adminId: adminLoginResult.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallAdminSession.IRequest,
      },
    );
  typia.assert(sessionsPage2);
  const pagination2 = sessionsPage2.pagination as unknown as IPaginationData | null;
  // Validate page 2 pagination metadata
  if (pagination2) {
    TestValidator.equals("page 2 current is 2", pagination2.current, 2);
    TestValidator.equals("page 2 limit is 10", pagination2.limit, 10);
  }
  // Validate total records match between pages
  if (pagination1 && pagination2) {
    TestValidator.equals(
      "total records consistent across pages",
      pagination1.records,
      pagination2.records,
    );
  }
}