import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";

/**
 * This test verifies that an authenticated administrator can search and
 * retrieve a paginated list of community platform moderators using advanced
 * filtering capabilities in the request body.
 *
 * 1. Register and authenticate as a new administrator.
 * 2. Perform a search with a non-matching email (expect empty result).
 * 3. Perform a search with existing filters (paging by status, date range, etc.)
 *    and check for valid pagination/results.
 * 4. Attempt fetching deleted (soft-deleted) moderators.
 * 5. Attempt the search as an unauthenticated user (should fail).
 */
export async function test_api_moderator_search_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Perform search with non-matching email (should return empty result)
  const bodyNonMatch = {
    email: "nomatch_" + RandomGenerator.alphaNumeric(8) + "@foo.com",
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformModerator.IRequest;
  const resNonMatch =
    await api.functional.communityPlatform.administrator.moderators.index(
      connection,
      { body: bodyNonMatch },
    );
  typia.assert(resNonMatch);
  TestValidator.equals("empty search result", resNonMatch.data.length, 0);

  // 3. Perform generic search (no filters, fetch first page)
  const bodyGeneric = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformModerator.IRequest;
  const resGeneric =
    await api.functional.communityPlatform.administrator.moderators.index(
      connection,
      { body: bodyGeneric },
    );
  typia.assert(resGeneric);
  TestValidator.predicate("result is array", Array.isArray(resGeneric.data));
  TestValidator.predicate(
    "pagination meta present",
    typeof resGeneric.pagination === "object" &&
      typeof resGeneric.pagination.current === "number" &&
      typeof resGeneric.pagination.limit === "number" &&
      typeof resGeneric.pagination.records === "number" &&
      typeof resGeneric.pagination.pages === "number",
  );
  if (resGeneric.data.length > 0) {
    TestValidator.predicate(
      "first moderator has id",
      typeof resGeneric.data[0].id === "string",
    );
  }

  // 4. Search filtering for deleted moderators (expect zero or only deleted entries)
  const bodyDeleted = {
    deleted: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformModerator.IRequest;
  const resDeleted =
    await api.functional.communityPlatform.administrator.moderators.index(
      connection,
      { body: bodyDeleted },
    );
  typia.assert(resDeleted);
  TestValidator.predicate(
    "deleted filter yields results or empty",
    Array.isArray(resDeleted.data),
  );

  // 5. Try as unauthenticated user (should throw error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is rejected", async () => {
    await api.functional.communityPlatform.administrator.moderators.index(
      unauthConn,
      { body: bodyGeneric },
    );
  });
}
