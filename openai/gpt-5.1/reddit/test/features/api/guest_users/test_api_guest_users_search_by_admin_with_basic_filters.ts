import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestuser";

/**
 * Validate guest user surrogate search and pagination for adminUser with basic
 * filters.
 *
 * Business goals
 *
 * - Ensure an adminUser can authenticate via join and then access the protected
 *   guestUsers search endpoint.
 * - Verify that PATCH /communityPlatform/adminUser/guestUsers accepts an
 *   ICommunityPlatformGuestuser.IRequest payload and returns a
 *   IPageICommunityPlatformGuestuser.ISummary response.
 * - Confirm that includeDeleted=false yields only active (non-deleted) guest
 *   records and that timestamp filters on created_at/updated_at are respected.
 * - Confirm that when no records match, the API still returns a well-formed empty
 *   page instead of an error.
 *
 * High-level steps
 *
 * 1. Admin join & authentication
 *
 *    - Call api.functional.auth.adminUser.join with a random but valid
 *         ICommunityPlatformAdminUserJoin.IRequest body.
 *    - This sets the Authorization header on the provided connection (handled
 *         automatically by SDK) and returns an
 *         ICommunityPlatformAdminuser.IAuthorized payload.
 * 2. Baseline unfiltered (or lightly filtered) guest search
 *
 *    - Build a baseline search request body using
 *         ICommunityPlatformGuestuser.IRequest with:
 *
 *         - Page: 1
 *         - Limit: some reasonable positive number (e.g., 20)
 *         - IncludeDeleted: false
 *         - No createdFrom/createdTo/updatedFrom/updatedTo filters so we can see whatever
 *                   guest data exists.
 *    - Call api.functional.communityPlatform.adminUser.guestUsers.index with that
 *         body.
 *    - Assert that the response conforms to
 *         IPageICommunityPlatformGuestuser.ISummary via typia.assert and that
 *         pagination metadata is consistent:
 *
 *         - Pagination.current equals 1
 *         - Pagination.limit equals the requested limit
 *         - Pagination.records >= data.length
 *         - Pagination.pages is >= 0 and coherent with records and limit (e.g., pages ===
 *                   0 if records===0; otherwise pages>=1).
 * 3. Time-window filter scenario (non-empty case when there is data)
 *
 *    - If the baseline page contains at least one record, pick one or more guest
 *         summaries from data.
 *    - From one selected summary, derive an inclusive/exclusive time window that
 *         should include that record:
 *
 *         - CreatedFrom: a value less than or equal to the record.created_at (for
 *                   example, exactly record.created_at).
 *         - CreatedTo: a value greater than record.created_at (for example,
 *                   record.created_at plus a small delta, or simply some
 *                   far-future timestamp like now+1day if we want to guarantee
 *                   inclusion). Alternatively, use updatedFrom/updatedTo
 *                   similarly based on updated_at.
 *    - Build a filtered ICommunityPlatformGuestuser.IRequest body with:
 *
 *         - Page: 1
 *         - Limit: same as before
 *         - IncludeDeleted: false
 *         - CreatedFrom/createdTo (or updatedFrom/updatedTo) populated as above.
 *    - Call guestUsers.index again.
 *    - Validate:
 *
 *         - Pagination.current and pagination.limit again match request.
 *         - Every returned summary has deleted_at === null.
 *         - Every returned summary has created_at (or updated_at) within the requested
 *                   window, according to the inclusivity/exclusivity
 *                   semantics:
 *
 *                           - CreatedFrom <= created_at < createdTo (or updatedFrom <= updated_at <
 *                         updatedTo).
 *         - At least one record is returned in this time-window scenario (the record we
 *                   targeted should match, but since the backend is opaque and
 *                   we do not control data, we at minimum assert data.length >=
 *                   0 and that if data is non-empty, it respects the window and
 *                   deletion flag).
 * 4. Time-window filter scenario (empty result window)
 *
 *    - Construct an ICommunityPlatformGuestuser.IRequest payload that is very
 *         unlikely to match any records, such as:
 *
 *         - CreatedFrom and createdTo representing a narrow window far in the past or
 *                   future (e.g., year 2000 or a future year like 2100) with
 *                   includeDeleted=false.
 *    - Call guestUsers.index again with that payload.
 *    - Validate that:
 *
 *         - Typia.assert succeeds for the IPageICommunityPlatformGuestuser.ISummary
 *                   response.
 *         - Pagination.current equals requested page, pagination.limit equals requested
 *                   limit.
 *         - Pagination.records === 0 implies data.length === 0 and pagination.pages ===
 *                   0, or in general that data.length <= pagination.records and
 *                   pages are consistent with records/limit.
 *         - No error is thrown; the endpoint returns a valid empty page.
 * 5. Basic robustness checks
 *
 *    - Ensure all calls are awaited and no un-awaited promises are left.
 *    - Do not attempt to manipulate connection.headers manually; rely solely on the
 *         SDK for Authorization.
 *    - Avoid creating or mutating non-schema properties.
 */
export async function test_api_guest_users_search_by_admin_with_basic_filters(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Baseline guest search (page=1, limit=20, includeDeleted=false)
  const baselineRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    includeDeleted: false,
  } satisfies ICommunityPlatformGuestuser.IRequest;

  const baselinePage: IPageICommunityPlatformGuestuser.ISummary =
    await api.functional.communityPlatform.adminUser.guestUsers.index(
      connection,
      {
        body: baselineRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformGuestuser.ISummary>(baselinePage);

  // Basic pagination consistency checks for baseline
  TestValidator.equals(
    "baseline current page should be 1",
    baselinePage.pagination.current,
    baselineRequestBody.page,
  );
  TestValidator.equals(
    "baseline limit should match request",
    baselinePage.pagination.limit,
    baselineRequestBody.limit,
  );
  TestValidator.predicate(
    "baseline records must be >= data length",
    baselinePage.pagination.records >= baselinePage.data.length,
  );
  TestValidator.predicate(
    "baseline pages must be >= 0",
    baselinePage.pagination.pages >= 0,
  );

  // 3. Time-window filter scenario (non-empty when there is data)
  if (baselinePage.data.length > 0) {
    const target: ICommunityPlatformGuestuser.ISummary = baselinePage.data[0];
    typia.assert(target);

    const createdFrom: string & tags.Format<"date-time"> = target.created_at;

    const createdDate = new Date(target.created_at);
    const futureDate = new Date(createdDate.getTime() + 60 * 60 * 1000);
    const createdTo: string & tags.Format<"date-time"> =
      futureDate.toISOString() as string & tags.Format<"date-time">;

    const windowRequestBody = {
      page: baselineRequestBody.page,
      limit: baselineRequestBody.limit,
      createdFrom,
      createdTo,
      includeDeleted: false,
    } satisfies ICommunityPlatformGuestuser.IRequest;

    const windowPage: IPageICommunityPlatformGuestuser.ISummary =
      await api.functional.communityPlatform.adminUser.guestUsers.index(
        connection,
        {
          body: windowRequestBody,
        },
      );
    typia.assert<IPageICommunityPlatformGuestuser.ISummary>(windowPage);

    TestValidator.equals(
      "window current page should be 1",
      windowPage.pagination.current,
      windowRequestBody.page,
    );
    TestValidator.equals(
      "window limit should match request",
      windowPage.pagination.limit,
      windowRequestBody.limit,
    );

    for (const guest of windowPage.data) {
      typia.assert<ICommunityPlatformGuestuser.ISummary>(guest);

      TestValidator.equals(
        "guest deleted_at must be null when includeDeleted=false",
        guest.deleted_at ?? null,
        null,
      );

      const guestCreated = new Date(guest.created_at).getTime();
      const fromTs = new Date(windowRequestBody.createdFrom!).getTime();
      const toTs = new Date(windowRequestBody.createdTo!).getTime();

      TestValidator.predicate(
        "guest.created_at must be >= createdFrom",
        guestCreated >= fromTs,
      );
      TestValidator.predicate(
        "guest.created_at must be < createdTo",
        guestCreated < toTs,
      );
    }
  }

  // 4. Time-window filter scenario (empty result window)
  const emptyWindowFrom: string & tags.Format<"date-time"> =
    "2000-01-01T00:00:00.000Z";
  const emptyWindowTo: string & tags.Format<"date-time"> =
    "2000-01-02T00:00:00.000Z";

  const emptyWindowRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    createdFrom: emptyWindowFrom,
    createdTo: emptyWindowTo,
    includeDeleted: false,
  } satisfies ICommunityPlatformGuestuser.IRequest;

  const emptyPage: IPageICommunityPlatformGuestuser.ISummary =
    await api.functional.communityPlatform.adminUser.guestUsers.index(
      connection,
      {
        body: emptyWindowRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformGuestuser.ISummary>(emptyPage);

  TestValidator.equals(
    "empty-window current page should be 1",
    emptyPage.pagination.current,
    emptyWindowRequestBody.page,
  );
  TestValidator.equals(
    "empty-window limit should match request",
    emptyPage.pagination.limit,
    emptyWindowRequestBody.limit,
  );
  TestValidator.predicate(
    "empty-window records must be >= data length",
    emptyPage.pagination.records >= emptyPage.data.length,
  );
  TestValidator.predicate(
    "empty-window pages must be >= 0",
    emptyPage.pagination.pages >= 0,
  );

  if (emptyPage.pagination.records === 0) {
    TestValidator.equals(
      "when records===0, data array should be empty",
      emptyPage.data.length,
      0,
    );
  }
}
