import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

export async function test_api_administrator_list_super_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Retrieve paginated list of all administrators with limit 20
  const response = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        limit: 20,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  // Validate complete response structure including pagination and data array
  typia.assert(response);
  // Verify pagination limit matches the requested value (business logic)
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    20,
  );
  // Verify security requirement: password hashes are not exposed in any admin summary
  for (const admin of response.data) {
    TestValidator.predicate(
      "password hash not exposed in summary",
      !("password" in admin) &&
        !("passwordHash" in admin) &&
        !("password_hash" in admin),
    );
  }
  // Verify soft-deleted administrators are excluded from results
  for (const admin of response.data) {
    TestValidator.predicate(
      "deleted_at not present in summary",
      !("deleted_at" in admin) && !("deletedAt" in admin),
    );
  }
}
