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

export async function test_api_sessions_platformwide_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create authenticated connection with token
  const sessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 2. Query sessions with pagination parameters
  const sessionsResponse =
    await api.functional.ecommerceMall.superAdmin.sessions.index(
      sessionConnection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  // 3. Validate response with typia.assert
  typia.assert(sessionsResponse);
  // 4. Validate pagination metadata structure
  // Note: sessionsResponse.pagination is IPageIEcommerceMall.IPagination which contains
  // a nested pagination.pagination of type IPage.IPagination with current, limit, records, pages
  TestValidator.equals(
    "pagination exists",
    sessionsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    sessionsResponse.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 20",
    sessionsResponse.pagination.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records count is valid",
    sessionsResponse.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    sessionsResponse.pagination.pagination.pages >= 0,
  );
  // Validate pages calculation matches records/limit
  const expectedPages =
    sessionsResponse.pagination.pagination.records === 0
      ? 0
      : Math.ceil(
          sessionsResponse.pagination.pagination.records /
            sessionsResponse.pagination.pagination.limit,
        );
  TestValidator.equals(
    "pages calculation correct",
    sessionsResponse.pagination.pagination.pages,
    expectedPages,
  );
  // 5. Validate data is an array
  TestValidator.predicate(
    "data is array",
    Array.isArray(sessionsResponse.data),
  );
  // 6. Validate sessions are sorted by created_at descending (newest first)
  for (let i = 1; i < sessionsResponse.data.length; i++) {
    const currentTime = new Date(sessionsResponse.data[i].createdAt).getTime();
    const previousTime = new Date(
      sessionsResponse.data[i - 1].createdAt,
    ).getTime();
    TestValidator.predicate(
      `session ${i} created_at is before or equal to session ${i - 1}`,
      currentTime <= previousTime,
    );
  }
  // 7. Validate each session summary has all required fields
  for (const session of sessionsResponse.data) {
    TestValidator.equals(
      "session has valid id",
      typeof session.id === "string",
      true,
    );
    TestValidator.equals(
      "session has ip",
      typeof session.ip === "string",
      true,
    );
    TestValidator.equals(
      "session has href",
      typeof session.href === "string",
      true,
    );
    TestValidator.equals(
      "session has referrer",
      typeof session.referrer === "string",
      true,
    );
    TestValidator.equals(
      "session has createdAt",
      typeof session.createdAt === "string",
      true,
    );
    TestValidator.equals(
      "session has expiredAt",
      typeof session.expiredAt === "string",
      true,
    );
    TestValidator.equals(
      "session has isActive boolean",
      typeof session.isActive === "boolean",
      true,
    );
    // Validate customer association
    TestValidator.equals(
      "session has customer",
      session.customer !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has id",
      typeof session.customer.id === "string",
      true,
    );
    TestValidator.equals(
      "customer has email",
      typeof session.customer.email === "string",
      true,
    );
    TestValidator.equals(
      "customer has createdAt",
      typeof session.customer.createdAt === "string",
      true,
    );
    TestValidator.equals(
      "customer has updatedAt",
      typeof session.customer.updatedAt === "string",
      true,
    );
  }
}
