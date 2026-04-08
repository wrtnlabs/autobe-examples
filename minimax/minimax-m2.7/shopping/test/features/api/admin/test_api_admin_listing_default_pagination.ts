import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_listing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
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
  typia.assert(authorized);
  // 2. Call admin listing endpoint with empty body (default pagination)
  const result =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata (correct property paths)
  TestValidator.equals(
    "has current page",
    result.pagination.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "has records count",
    result.pagination.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "has pages count",
    result.pagination.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "has limit",
    result.pagination.pagination.limit > 0,
    true,
  );
  // 4. Validate data array contains admin summaries
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 5. Validate each admin summary has required fields
  for (const admin of result.data) {
    TestValidator.predicate("admin has id", !!admin.id);
    TestValidator.predicate("admin has email", !!admin.email);
    TestValidator.predicate("admin has name", !!admin.name);
    TestValidator.predicate("admin has created_at", !!admin.created_at);
    TestValidator.predicate("admin has updated_at", !!admin.updated_at);
    TestValidator.predicate(
      "admin has is_super_admin",
      typeof admin.is_super_admin === "boolean",
    );
  }
  // 6. Verify sorted by created_at descending
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = new Date(result.data[i].created_at).getTime();
      const next = new Date(result.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `sorted by created_at descending`,
        current >= next,
      );
    }
  }
}
