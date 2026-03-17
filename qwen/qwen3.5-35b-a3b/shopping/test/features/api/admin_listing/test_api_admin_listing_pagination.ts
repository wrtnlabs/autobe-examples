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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Admin Setup - Join and get authorized
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Query admin list with pagination
  const adminConnection: api.IConnection = { host: connection.host };
  const response = await api.functional.ecommerceMall.superAdmin.admins.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate("has total records", response.pagination.records > 0);
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    Math.ceil(response.pagination.records / 20),
  );
  // 4. Validate data array structure
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  TestValidator.predicate("has admin summaries", response.data.length > 0);
  // 5. Validate each admin summary
  for (const admin of response.data) {
    typia.assert(admin);
    TestValidator.predicate(
      "id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        admin.id,
      ),
    );
    TestValidator.predicate("email is string", typeof admin.email === "string");
    TestValidator.predicate(
      "status is valid",
      admin.status === "active" ||
        admin.status === "suspended" ||
        admin.status === "banned",
    );
    TestValidator.predicate(
      "created_at is valid ISO datetime",
      !isNaN(Date.parse(admin.created_at)),
    );
  }
  // 6. Verify sorting is by created_at descending (newest first)
  if (response.data.length > 1) {
    const sorted = response.data.every((admin, index) => {
      if (index === 0) return true;
      const prevDate = new Date(response.data[index - 1].created_at).getTime();
      const currentDate = new Date(admin.created_at).getTime();
      return prevDate >= currentDate;
    });
    TestValidator.predicate("admins sorted by created_at descending", sorted);
  }
}
