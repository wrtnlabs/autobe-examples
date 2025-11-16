import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPlatformSetting";

/**
 * Validate platform settings search by key prefix and creation date range.
 *
 * Business context: Platform administrators manage global configuration through
 * community_platform_platform_settings, using machine keys (e.g.,
 * "karma.community_creation_threshold", "voting.max_votes_per_hour") and
 * associated values. The search endpoint PATCH
 * /communityPlatform/platformAdmin/platformSettings exposes a read-only,
 * paginated view filtered by ICommunityPlatformPlatformSetting.IRequest. This
 * test ensures that key-based and created_at-based filters work together as
 * expected for a platformAdmin actor.
 *
 * Test flow:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join. The SDK
 *    automatically stores the returned JWT access token into the connection
 *    headers, so subsequent calls are authenticated as platformAdmin.
 * 2. As the platform admin, create four platform settings via POST
 *    /communityPlatform/platformAdmin/platformSettings:
 *
 *    - Two settings with keys starting with "karma." (e.g., "karma.threshold.1",
 *         "karma.threshold.2").
 *    - Two settings with keys starting with another prefix such as "voting." (e.g.,
 *         "voting.limit.1", "voting.limit.2"). All creations return full
 *         ICommunityPlatformPlatformSetting objects, including server-assigned
 *         created_at timestamps that will be used for date-range filtering.
 * 3. Compute a date range that certainly includes all of the created settings:
 *
 *    - Find the minimum and maximum created_at among all four created records.
 *    - Derive createdFrom as a timestamp slightly before the min created_at (for
 *         example by subtracting a few seconds).
 *    - Derive createdTo as a timestamp slightly after the max created_at (by adding
 *         a few seconds).
 * 4. Build an ICommunityPlatformPlatformSetting.IRequest that uses:
 *
 *    - Key = "karma." so that the backend treats it as a key prefix filter.
 *    - CreatedFrom and createdTo as the calculated range.
 *    - Limit large enough (e.g., 10) to fit all expected matches in a single page
 *         and page = 1.
 * 5. Call api.functional.communityPlatform.platformAdmin.platformSettings.index
 *    with the request. Assert the response type with typia.assert and then
 *    perform the following validations using TestValidator:
 *
 *    - Every summary in data has a key that starts with "karma.".
 *    - Every summary in data has created_at between createdFrom and createdTo
 *         inclusive.
 *    - No summary in data has a key starting with a different prefix such as
 *         "voting." (those were created in step 2 but should be filtered out by
 *         the key prefix).
 *    - Pagination.current is 1, pagination.limit equals the requested limit,
 *         pagination.records equals data.length, and pagination.pages is 1 when
 *         all matching rows fit on a single page.
 * 6. Optionally, call the same index endpoint again with the same date range but
 *    key = null to fetch all settings created in that window, then assert
 *    that:
 *
 *    - The total number of summaries in the all-settings query is greater than or
 *         equal to the number of summaries returned when key = "karma.".
 *    - At least one summary with a different prefix (e.g., starting with "voting.")
 *         appears in the unfiltered result, proving that the key filter is
 *         actually narrowing the dataset.
 *
 * Notes and constraints:
 *
 * - The original high-level specification mentioned verifying updatedFrom and
 *   updatedTo by performing an update via a PUT-by-id endpoint. However, the
 *   provided SDK surface only includes create and index operations; there is no
 *   update method available. To keep the test compilable and consistent with
 *   the available API, this implementation restricts validation to the
 *   key-based and created_at-based filters and does not attempt to drive any
 *   updated_at changes.
 * - All date values are handled as ISO 8601 strings in UTC, derived either from
 *   server responses (created_at) or via JavaScript Date arithmetic converted
 *   back to ISO strings.
 */
export async function test_api_platform_settings_search_by_key_prefix_and_date_range(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain an authenticated session
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Create multiple platform settings with different key prefixes
  const karmaSetting1 =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: {
          key: "karma.threshold.1",
          value: "10",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          is_active: true,
        } satisfies ICommunityPlatformPlatformSetting.ICreate,
      },
    );
  typia.assert(karmaSetting1);

  const karmaSetting2 =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: {
          key: "karma.threshold.2",
          value: "20",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          is_active: true,
        } satisfies ICommunityPlatformPlatformSetting.ICreate,
      },
    );
  typia.assert(karmaSetting2);

  const votingSetting1 =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: {
          key: "voting.limit.1",
          value: "5",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          is_active: true,
        } satisfies ICommunityPlatformPlatformSetting.ICreate,
      },
    );
  typia.assert(votingSetting1);

  const votingSetting2 =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: {
          key: "voting.limit.2",
          value: "15",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          is_active: false,
        } satisfies ICommunityPlatformPlatformSetting.ICreate,
      },
    );
  typia.assert(votingSetting2);

  const createdAll: ICommunityPlatformPlatformSetting[] = [
    karmaSetting1,
    karmaSetting2,
    votingSetting1,
    votingSetting2,
  ];

  // 3. Compute an inclusive created_at date range around all created settings
  const createdDates = createdAll.map((s) => new Date(s.created_at).getTime());

  const minCreated = Math.min(...createdDates);
  const maxCreated = Math.max(...createdDates);

  const createdFromDate = new Date(minCreated - 5_000);
  const createdToDate = new Date(maxCreated + 5_000);

  const createdFrom = createdFromDate.toISOString();
  const createdTo = createdToDate.toISOString();

  // 4. Build request for key prefix "karma." with the created_at date range
  const limit: number & tags.Type<"int32"> & tags.Minimum<1> = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const karmaRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    isActive: null,
    key: "karma.",
    search: null,
    createdFrom,
    createdTo,
    updatedFrom: null,
    updatedTo: null,
    orderBy: "created_at" as const,
    orderDirection: "asc" as const,
  } satisfies ICommunityPlatformPlatformSetting.IRequest;

  // 5. Call index endpoint and assert the response type
  const karmaPage =
    await api.functional.communityPlatform.platformAdmin.platformSettings.index(
      connection,
      {
        body: karmaRequest,
      },
    );
  typia.assert(karmaPage);

  const karmaPagination = karmaPage.pagination;
  const karmaData = karmaPage.data;

  // Basic pagination expectations
  TestValidator.equals(
    "karma page current should be 1",
    karmaPagination.current,
    1,
  );
  TestValidator.equals(
    "karma page limit should equal requested limit",
    karmaPagination.limit,
    limit,
  );
  TestValidator.equals(
    "karma page records should equal data length",
    karmaPagination.records,
    karmaData.length,
  );
  TestValidator.predicate(
    "karma page pages should be at least 1",
    karmaPagination.pages >= 1,
  );

  // 6. Validate that all returned summaries match key prefix and date range
  for (const summary of karmaData) {
    // Type guard
    typia.assert<ICommunityPlatformPlatformSetting.ISummary>(summary);

    TestValidator.predicate(
      "every returned setting key should start with 'karma.'",
      summary.key.startsWith("karma."),
    );

    const createdTime = new Date(summary.created_at).getTime();
    TestValidator.predicate(
      "summary.created_at should be within [createdFrom, createdTo]",
      createdTime >= createdFromDate.getTime() &&
        createdTime <= createdToDate.getTime(),
    );

    TestValidator.predicate(
      "no returned summary key should start with 'voting.'",
      !summary.key.startsWith("voting."),
    );
  }

  // 7. Optional: query all settings in the same date range without key filter
  const allRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    isActive: null,
    key: null,
    search: null,
    createdFrom,
    createdTo,
    updatedFrom: null,
    updatedTo: null,
    orderBy: "created_at" as const,
    orderDirection: "asc" as const,
  } satisfies ICommunityPlatformPlatformSetting.IRequest;

  const allPage =
    await api.functional.communityPlatform.platformAdmin.platformSettings.index(
      connection,
      {
        body: allRequest,
      },
    );
  typia.assert(allPage);

  const allData = allPage.data;

  TestValidator.predicate(
    "unfiltered data length should be at least karma-only data length",
    allData.length >= karmaData.length,
  );

  const hasVotingPrefix = allData.some((s) => s.key.startsWith("voting."));

  TestValidator.predicate(
    "unfiltered result should contain at least one 'voting.' setting",
    hasVotingPrefix,
  );
}
