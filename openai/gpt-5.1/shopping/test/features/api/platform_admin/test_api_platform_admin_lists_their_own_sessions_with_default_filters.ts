import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformadminSession";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformadminSession";

/**
 * Verify that a platform administrator can list their own authentication
 * sessions using default search and pagination criteria.
 *
 * Business workflow validated by this test:
 *
 * 1. A new platform admin joins the system, which implicitly creates an initial
 *    session for that admin.
 * 2. The same admin performs multiple explicit login operations, creating
 *    additional platformadmin session rows with realistic context values like
 *    ip, href and referrer.
 * 3. Using the latest authenticated context, the admin calls the sessions listing
 *    endpoint with an essentially empty
 *    IShoppingMallPlatformadminSession.IRequest body so that the backend
 *    applies its default pagination and sorting behavior.
 * 4. The test then verifies that:
 *
 *    - Pagination metadata is consistent and records count reflects at least the
 *         number of sessions created in this flow.
 *    - All listed sessions belong to the same platform admin.
 *    - Context fields like ipAddress, href and referrer are populated.
 *    - At least one session is currently active.
 *    - The default ordering by createdAt is non-increasing (newest first).
 */
export async function test_api_platform_admin_lists_their_own_sessions_with_default_filters(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join).
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const joinHref: string & tags.Format<"uri"> =
    "https://admin.example.com/join" as string & tags.Format<"uri">;
  const joinReferrer: string & tags.Format<"uri"> =
    "https://www.example.com/landing" as string & tags.Format<"uri">;

  const joinBody = {
    email,
    name: RandomGenerator.name(),
    password: "P@ssw0rd-1234",
    ip: "203.0.113.10",
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joined: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  const adminId = joined.id;

  // 2. Perform multiple login operations for the same admin to create more sessions.
  const loginHref1: string & tags.Format<"uri"> =
    "https://admin.example.com/login" as string & tags.Format<"uri">;
  const loginReferrer1: string & tags.Format<"uri"> =
    "https://www.example.com/banner" as string & tags.Format<"uri">;

  const loginHref2: string & tags.Format<"uri"> =
    "https://admin.example.com/dashboard" as string & tags.Format<"uri">;
  const loginReferrer2: string & tags.Format<"uri"> =
    "https://admin.example.com/login" as string & tags.Format<"uri">;

  const loginBody1 = {
    email,
    password: joinBody.password,
    ip: "198.51.100.7",
    href: loginHref1,
    referrer: loginReferrer1,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const loginBody2 = {
    email,
    password: joinBody.password,
    // let the server infer IP in this login to ensure it still populates ipAddress
    ip: null,
    href: loginHref2,
    referrer: loginReferrer2,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const login1: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginBody1,
    });
  typia.assert(login1);

  const login2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginBody2,
    });
  typia.assert(login2);

  const totalSessionsCreated = 1 + 2; // 1 from join, 2 from logins

  // 3. Call the sessions listing endpoint with default/empty filters.
  const requestBody = {} satisfies IShoppingMallPlatformadminSession.IRequest;

  const page: IPageIShoppingMallPlatformadminSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId: adminId,
        body: requestBody,
      },
    );
  typia.assert(page);

  const pagination: IPage.IPagination = page.pagination;
  const sessions = page.data;

  // 4. Pagination invariants.
  TestValidator.predicate(
    "pagination.records is at least the number of created sessions",
    pagination.records >= totalSessionsCreated,
  );

  TestValidator.predicate(
    "data length does not exceed pagination.limit",
    sessions.length <= pagination.limit,
  );

  TestValidator.predicate(
    "data length does not exceed pagination.records",
    sessions.length <= pagination.records,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "no pages when there are no records",
      pagination.pages,
      0,
    );
    TestValidator.equals(
      "current page index is zero when there are no records",
      pagination.current,
      0,
    );
    return;
  }

  TestValidator.predicate(
    "there is at least one page when records exist",
    pagination.pages >= 1,
  );

  TestValidator.predicate(
    "current page index is non-negative",
    pagination.current >= 0,
  );

  // 5. All sessions belong to the same platform admin.
  for (const session of sessions) {
    TestValidator.equals(
      "session.platformAdmin.id must match the joined admin id",
      session.platformAdmin.id,
      adminId,
    );
  }

  // 6. Context fields population.
  for (const session of sessions) {
    TestValidator.predicate(
      "ipAddress is populated",
      typeof session.ipAddress === "string" && session.ipAddress.length > 0,
    );
    TestValidator.predicate(
      "href is populated",
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      "referrer is populated",
      typeof session.referrer === "string" && session.referrer.length > 0,
    );

    if (session.userAgent !== undefined) {
      TestValidator.predicate(
        "userAgent, when present, is non-empty",
        session.userAgent.length > 0,
      );
    }
  }

  // 7. is_active vs expiredAt semantics.
  const hasActive = sessions.some((s) => s.is_active === true);
  TestValidator.predicate(
    "at least one session is currently active",
    hasActive,
  );

  for (const session of sessions) {
    if (session.expiredAt !== undefined) {
      TestValidator.predicate(
        "sessions with expiredAt defined are not active",
        session.is_active === false,
      );
    }
  }

  // 8. Default sort ordering: createdAt should be non-increasing.
  let isSortedByCreatedAtDesc = true;
  for (let i = 1; i < sessions.length; i++) {
    const prev = sessions[i - 1].createdAt;
    const curr = sessions[i].createdAt;
    if (prev < curr) {
      isSortedByCreatedAtDesc = false;
      break;
    }
  }
  TestValidator.predicate(
    "sessions are ordered by createdAt in non-increasing order",
    isSortedByCreatedAtDesc,
  );
}
