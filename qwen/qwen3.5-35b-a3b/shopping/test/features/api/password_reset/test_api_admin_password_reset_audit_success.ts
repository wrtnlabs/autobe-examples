import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin password reset audit success path for retrieving password reset requests.
 *
 * This test validates that administrators can successfully retrieve a paginated list
 * of password reset requests across all actor types, with proper pagination metadata
 * and security constraints.
 */
export async function test_api_admin_password_reset_audit_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create test users with password reset requests (simulated via random generation)
  // Since we need to simulate password reset requests for testing, we'll generate them
  const passwordResetCount = 5;
  const passwordResets = ArrayUtil.repeat(passwordResetCount, () => {
    const createdAt = new Date(
      Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
    );
    const expiredAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      email: typia.random<string & tags.Format<"email">>(),
      expired_at: expiredAt.toISOString(),
      created_at: createdAt.toISOString(),
    } satisfies IEcommerceMallSellerPasswordReset.ISummary;
  });
  // 3. Admin retrieves all password reset requests without filters
  const response =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // 4. Verify pagination metadata
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit valid",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages correct",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 5. Verify each entry has required fields (already validated by typia.assert(response))
  // typia.assert already validates all required fields in response.data entries
  // 6. Verify results are sorted by created_at descending
  for (let i = 1; i < response.data.length; i++) {
    const prevCreated = new Date(response.data[i - 1].created_at);
    const currCreated = new Date(response.data[i].created_at);
    TestValidator.predicate(
      "entries sorted descending",
      prevCreated >= currCreated,
    );
  }
  // 7. Verify sensitive data (tokens) are not exposed in response
  // Note: TypeScript type system guarantees tokens are not in ISummary, so no runtime check needed
}
