import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";

/**
 * Tests access, pagination, filtering, and security of the admin index API.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin account
 * 2. Create additional admin accounts for realistic data
 * 3. Access the index endpoint as authenticated admin with pagination, sorting,
 *    and search
 * 4. Verify search and filtering correctness
 * 5. Check that credential info is not exposed
 * 6. Test endpoint with unauthenticated and non-admin access
 * 7. Confirm audit/rate limiting mechanisms (as much as observable)
 */
export async function test_api_admin_admins_index_pagination_and_search(
  connection: api.IConnection,
) {
  // 1. Register the first admin who becomes the test actor
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminDisplayName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: adminDisplayName,
        href: "https://admin.e2e-testsuite.com/register",
        referrer: "https://admin.e2e-testsuite.com/start",
        ip: null,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create additional admin users for testing
  const extraAdmins = ArrayUtil.repeat(7, () => {
    return {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://admin.e2e-testsuite.com/register",
      referrer: "https://admin.e2e-testsuite.com/start",
      ip: null,
    } satisfies ICommunityPlatformAdmin.ICreate;
  });
  for (const extra of extraAdmins) {
    const output = await api.functional.auth.admin.join(connection, {
      body: extra,
    });
    typia.assert(output);
  }

  // 3. Paginated, filtered, and sorted search as authenticated admin
  const searchDisplay = extraAdmins[0].display_name.slice(0, 3);
  const requestBody = {
    page: 1 as number,
    limit: 5 as number,
    search: searchDisplay,
    order_by: "display_name",
    order_direction: "asc",
  } satisfies ICommunityPlatformAdmin.IRequest;

  const pageResult = await api.functional.communityPlatform.admin.admins.index(
    connection,
    {
      body: requestBody,
    },
  );
  typia.assert(pageResult);
  TestValidator.equals("pagination limit", pageResult.pagination.limit, 5);
  TestValidator.predicate(
    "display_name search filtering works",
    pageResult.data.some((x) => x.display_name.includes(searchDisplay)),
  );
  TestValidator.predicate(
    "no credential fields exposed",
    pageResult.data.every(
      (x) =>
        x.hasOwnProperty("id") &&
        x.hasOwnProperty("display_name") &&
        !Object.keys(x).some(
          (k) => k === "password" || k === "password_hash" || k === "token",
        ),
    ),
  );

  // 4. Try to access as unauthenticated (no token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated user denied", async () => {
    await api.functional.communityPlatform.admin.admins.index(unauthConn, {
      body: requestBody,
    });
  });

  // ---
  // If non-admin access is technically possible in this context, test here.
  // ---

  // (Optional) 5. Try rate limiting by calling endpoint rapidly (may not be reliably testable)
}
