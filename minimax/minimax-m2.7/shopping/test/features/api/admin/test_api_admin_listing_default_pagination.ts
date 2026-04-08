import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
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

export async function test_api_admin_listing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create an additional admin account to have data in the list
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  await api.functional.ecommerceMall.auth.admin.join(adminConnection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: `https://test.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://test.com/${RandomGenerator.alphaNumeric(8)}`,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. Retrieve paginated admin list with default pagination (empty body)
  const adminListResponse =
    await api.functional.ecommerceMall.admin.admin.admins.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(adminListResponse);
  // 4. Validate response structure matches IPageIEcommerceMallAdmin.ISummary
  TestValidator.equals(
    "response has pagination property",
    "pagination" in adminListResponse,
    true,
  );
  TestValidator.equals(
    "response has data property",
    "data" in adminListResponse,
    true,
  );
  TestValidator.equals(
    "data is an array",
    Array.isArray(adminListResponse.data),
    true,
  );
  // 5. Validate pagination metadata with default values
  const pagination = adminListResponse.pagination;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("limit is 20 (default)", pagination.limit, 20);
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
  TestValidator.predicate(
    "pages calculated correctly (Math.ceil(records / limit))",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  // 6. Verify admins are sorted by created_at descending (newest first)
  if (adminListResponse.data.length > 1) {
    for (let i = 0; i < adminListResponse.data.length - 1; i++) {
      const current = new Date(adminListResponse.data[i].created_at);
      const next = new Date(adminListResponse.data[i + 1].created_at);
      TestValidator.predicate(
        `admin[${i}] created_at >= admin[${i + 1}] created_at (sorted desc)`,
        current.getTime() >= next.getTime(),
      );
    }
  }
  // 7. Validate each admin has required fields
  for (let i = 0; i < adminListResponse.data.length; i++) {
    const admin = adminListResponse.data[i];
    TestValidator.predicate(
      `admin[${i}] has valid UUID id`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        admin.id,
      ),
    );
    TestValidator.predicate(
      `admin[${i}] has email`,
      typeof admin.email === "string" && admin.email.includes("@"),
    );
    TestValidator.predicate(
      `admin[${i}] has name`,
      typeof admin.name === "string" && admin.name.length > 0,
    );
    TestValidator.predicate(
      `admin[${i}] has valid date-time created_at`,
      !isNaN(new Date(admin.created_at).getTime()),
    );
  }
}
