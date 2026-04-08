import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_password_reset_basic_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Submit admin request to create admin account
  const authorized: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(connection, {
      body: {
        actorType: "customer",
        requestedGrade: "admin",
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  // 2. Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: authorized.email,
      password: "whatever",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Call password reset listing endpoint with default pagination
  const response: IPageIEcommerceMallAdminPasswordReset =
    await api.functional.ecommerceMall.admin.admin.password_resets.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  // 4. Validate response structure with typia.assert
  typia.assert(response);
  // 5. Validate pagination metadata - cast to access expected properties
  const pagination = response.pagination as {
    page?: number;
    limit?: number;
    total?: number;
    totalPage?: number;
  };
  TestValidator.equals(
    "pagination has page",
    pagination.page !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has total",
    pagination.total !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has totalPage",
    pagination.totalPage !== undefined,
    true,
  );
  // 6. Validate records array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 7. If records exist, validate their structure
  if (response.data.length > 0) {
    const firstRecord = response.data[0];
    TestValidator.predicate("record has id", !!firstRecord.id);
    TestValidator.predicate("record has admin", !!firstRecord.admin);
    TestValidator.predicate(
      "admin has id",
      !!(firstRecord.admin as IEcommerceMallAdmin.ISummary).id,
    );
    TestValidator.predicate(
      "admin has email",
      !!(firstRecord.admin as IEcommerceMallAdmin.ISummary).email,
    );
    TestValidator.predicate(
      "admin has name",
      !!(firstRecord.admin as IEcommerceMallAdmin.ISummary).name,
    );
    TestValidator.predicate(
      "admin has is_super_admin",
      (firstRecord.admin as IEcommerceMallAdmin.ISummary).is_super_admin !==
        undefined,
    );
    TestValidator.predicate("record has expiresAt", !!firstRecord.expiresAt);
    TestValidator.predicate(
      "usedAt is null or string",
      firstRecord.usedAt === null || typeof firstRecord.usedAt === "string",
    );
    TestValidator.predicate("record has createdAt", !!firstRecord.createdAt);
    TestValidator.predicate("record has updatedAt", !!firstRecord.updatedAt);
    // 8. Validate ordering by createdAt descending (newest first)
    for (let i = 1; i < response.data.length; i++) {
      const prev = new Date(response.data[i - 1].createdAt);
      const curr = new Date(response.data[i].createdAt);
      TestValidator.predicate(
        "records ordered by createdAt descending",
        prev >= curr,
      );
    }
  }
}