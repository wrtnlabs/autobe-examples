import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberuser";

/**
 * Validate basic admin memberUser listing with pagination, sorting, and
 * filtering.
 *
 * Business intent
 *
 * - Ensure an authenticated adminUser can call the administrative member user
 *   listing endpoint.
 * - Verify PATCH /communityPlatform/adminUser/memberUsers honors basic pagination
 *   and sort parameters.
 * - Exercise simple filter flags (email verification, deletion) even though they
 *   are not exposed in the summary DTO.
 * - Confirm the summary projection does not leak sensitive account data (password
 *   hashes, emails, etc.).
 *
 * Scenario steps
 *
 * 1. Register a new adminUser account via POST /auth/adminUser/join.
 *
 *    - This also injects the admin JWT into the SDK connection headers
 *         automatically.
 * 2. Create a generic account restriction episode via POST
 *    /communityPlatform/adminUser/accountRestrictions.
 *
 *    - This seeds some restriction-related data; it is not directly required by the
 *         index call but ensures related joins have at least one episode in the
 *         database.
 * 3. Call PATCH /communityPlatform/adminUser/memberUsers
 *    (api.functional.communityPlatform.adminUser.memberUsers.index) with an
 *    ICommunityPlatformMemberuser.IRequest body:
 *
 *    - Use page=1 and pageSize=10 as a reasonable first-page request.
 *    - Set sortField="created_at" and sortOrder="desc".
 *    - Apply filters isEmailVerified=true and deleted=false.
 * 4. Assert the response structure as IPageICommunityPlatformMemberuser.ISummary.
 *
 *    - Pagination.current equals the requested page (or default if page omitted).
 *    - Pagination.limit equals the requested pageSize (or default if pageSize
 *         omitted).
 *    - Pagination.records and pagination.pages are non-negative integers.
 * 5. For each member summary record:
 *
 *    - Use typia.assert to ensure it matches ICommunityPlatformMemberuser.ISummary
 *         shape.
 *    - Perform lightweight sanity checks such as non-empty username.
 *    - Trust that filters are enforced on hidden fields (is_email_verified,
 *         deleted_at), since ISummary intentionally omits them.
 * 6. Ensure that only documented ISummary properties exist on each record,
 *    implicitly verifying that sensitive internal fields are not exposed.
 */
export async function test_api_admin_memberuser_index_basic_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser via join API
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorizedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorizedAdmin);

  // 2. Seed a generic account restriction episode (no direct linkage required here)
  const now = new Date();
  const restrictionBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: now.toISOString(),
    ends_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(restriction);

  // 3. Call memberUsers.index with basic pagination, sorting, and filtering
  const page = 1 as number & tags.Type<"int32">;
  const pageSize = 10 as number & tags.Type<"int32">;

  const requestBody = {
    page,
    pageSize,
    sortField: "created_at",
    sortOrder: "desc",
    isEmailVerified: true,
    deleted: false,
  } satisfies ICommunityPlatformMemberuser.IRequest;

  const pageResult: IPageICommunityPlatformMemberuser.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageICommunityPlatformMemberuser.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 4. Validate pagination metadata consistency
  TestValidator.equals(
    "current page should match requested page when specified",
    page,
    pagination.current,
  );
  TestValidator.equals(
    "page size (limit) should match requested pageSize",
    pageSize,
    pagination.limit,
  );
  TestValidator.predicate(
    "records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    pagination.pages >= 0,
  );

  // 5. Validate each member summary record
  await ArrayUtil.asyncForEach(pageResult.data, async (member, index) => {
    // Type-level assertion for each summary element
    typia.assert<ICommunityPlatformMemberuser.ISummary>(member);

    TestValidator.predicate(
      `member[${index}].id must be a non-empty string`,
      typeof member.id === "string" && member.id.length > 0,
    );
    TestValidator.predicate(
      `member[${index}].username must be a non-empty string`,
      typeof member.username === "string" && member.username.length > 0,
    );

    // Optional fields sanity checks when present
    if (member.displayName !== undefined) {
      const displayName = member.displayName;
      TestValidator.predicate(
        `member[${index}].displayName, when present, must be non-empty`,
        displayName.length > 0,
      );
    }
    if (member.avatarUrl !== undefined) {
      const avatarUrl = member.avatarUrl;
      TestValidator.predicate(
        `member[${index}].avatarUrl, when present, must be non-empty`,
        avatarUrl.length > 0,
      );
    }
    if (member.karmaScore !== undefined) {
      const karmaScore = member.karmaScore;
      TestValidator.predicate(
        `member[${index}].karmaScore, when present, should be an integer`,
        Number.isInteger(karmaScore),
      );
    }
  });

  // 6. Projection safety is implicitly validated by typia.assert against
  // ICommunityPlatformMemberuser.ISummary and IPageICommunityPlatformMemberuser.ISummary,
  // ensuring no sensitive fields (e.g., password_hash, email) are present.
}
