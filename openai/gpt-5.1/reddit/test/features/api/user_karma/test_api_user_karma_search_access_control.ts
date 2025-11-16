import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserKarma";

/**
 * Validate that user karma search is only accessible to admin users.
 *
 * Business purpose: The community platform exposes
 * /communityPlatform/adminUser/userKarmas as an admin-only aggregate view of
 * all member users' karma. Normal member users must never be able to query this
 * bulk aggregate. This test verifies that access control is enforced at the API
 * gateway/backend, and that the same underlying endpoint behaves differently
 * depending on the authenticated actor bound to the connection.
 *
 * Scenario steps:
 *
 * 1. Register a memberUser via /auth/memberUser/join, which mutates the shared
 *    connection to carry a memberUser JWT in Authorization header.
 * 2. With this memberUser-authenticated connection, attempt to call PATCH
 *    /communityPlatform/adminUser/userKarmas with a syntactically valid
 *    ICommunityPlatformUserKarma.IRequest body.
 *
 *    - Expect this call to fail with an HTTP error (authorization failure).
 *    - Use TestValidator.error to assert that an error is thrown.
 *    - Do NOT attempt to inspect HTTP status codes or response body; just verify
 *         that the call does not succeed and therefore no
 *         IPageICommunityPlatformUserKarma.ISummary is produced.
 * 3. Next, register an adminUser via /auth/adminUser/join. This overwrites the
 *    connection Authorization header with an adminUser JWT.
 * 4. With the admin-authenticated connection, call PATCH
 *    /communityPlatform/adminUser/userKarmas again using another valid
 *    ICommunityPlatformUserKarma.IRequest body (it can be simple pagination
 *    like first page with small limit).
 * 5. Expect this second call to succeed and return a
 *    IPageICommunityPlatformUserKarma.ISummary structure.
 *
 *    - Assert the type of the response using typia.assert.
 *    - Perform basic sanity checks using TestValidator.equals/predicate, such as
 *         verifying that pagination.current is the page you requested and that
 *         limit matches the requested limit.
 *    - Optionally validate that each element in data has a memberuser object with id
 *         and username populated (non-empty strings), but avoid over-validating
 *         since typia.assert already covers types.
 *
 * Error handling rules:
 *
 * - Do not attempt to validate specific HTTP status code values or error payload
 *   structure for the unauthorized memberUser call; only assert that an error
 *   is thrown.
 * - Do not write any tests that intentionally violate TypeScript types or send
 *   malformed request bodies; all request bodies must strictly satisfy their
 *   DTO interfaces.
 */
export async function test_api_user_karma_search_access_control(
  connection: api.IConnection,
) {
  // 1. Register member user and get authorized context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://community.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. As memberUser, attempt to search user karmas and expect authorization error
  const memberSearchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sortBy: "totalKarma" as const,
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformUserKarma.IRequest;

  await TestValidator.error(
    "memberUser cannot access admin userKarmas search",
    async () => {
      await api.functional.communityPlatform.adminUser.userKarmas.index(
        connection,
        {
          body: memberSearchRequest,
        },
      );
    },
  );

  // 3. Register an admin user and get authorized context (connection now carries admin token)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16) as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 4. As adminUser, successfully search user karmas
  const adminSearchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sortBy: "totalKarma" as const,
    sortDirection: "asc" as const,
  } satisfies ICommunityPlatformUserKarma.IRequest;

  const page: IPageICommunityPlatformUserKarma.ISummary =
    await api.functional.communityPlatform.adminUser.userKarmas.index(
      connection,
      {
        body: adminSearchRequest,
      },
    );
  typia.assert<IPageICommunityPlatformUserKarma.ISummary>(page);

  // 5. Basic sanity checks on pagination fields
  TestValidator.equals(
    "requested page should match pagination.current",
    page.pagination.current,
    adminSearchRequest.page ?? 1,
  );
  TestValidator.equals(
    "requested limit should match pagination.limit",
    page.pagination.limit,
    adminSearchRequest.limit ?? 5,
  );

  // Ensure pagination metadata is non-negative
  TestValidator.predicate(
    "pagination.records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    page.pagination.pages >= 0,
  );

  // Optionally check that each returned summary has consistent structure
  for (const summary of page.data) {
    typia.assert<ICommunityPlatformUserKarma.ISummary>(summary);
    TestValidator.predicate(
      "memberuser.id must be a non-empty string",
      summary.memberuser.id.length > 0,
    );
    TestValidator.predicate(
      "memberuser.username must be a non-empty string",
      summary.memberuser.username.length > 0,
    );
  }
}
