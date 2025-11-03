import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformKarmaStats } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaStats";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaStats";

/**
 * Validate retrieval and filtered search of user karma statistics as an admin.
 *
 * This test verifies that an administrator can:
 *
 * 1. Register as an admin (joins with unique credentials)
 * 2. Retrieve a paginated, filtered karma stats list using search/filter fields
 * 3. Confirm returned stats match requested pagination/filter criteria and contain
 *    no PII
 * 4. Check that sensitive user data is not leaked in admin analytics results
 * 5. Ensure unauthorized (non-authenticated) requests fail
 */
export async function test_api_admin_karma_stats_search_and_filtering(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(2),
        href: "https://admin.test.example.com/join",
        referrer: "https://platform.example.com/",
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Search for karma stats as authenticated admin
  const minKarma = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
  >();
  const searchBody = {
    page: 1,
    limit: 10,
    min_total_karma: minKarma,
    sort_by: "post_karma",
    sort_order: "desc",
  } satisfies ICommunityPlatformKarmaStats.IRequest;

  const statsPage: IPageICommunityPlatformKarmaStats =
    await api.functional.communityPlatform.admin.karmaStats.index(connection, {
      body: searchBody,
    });
  typia.assert(statsPage);

  // 3. Validate response respects pagination and filtering
  TestValidator.equals(
    "pagination page is correct",
    statsPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches requested",
    statsPage.pagination.limit,
    10,
  );
  if (typeof minKarma === "number")
    TestValidator.predicate(
      "all returned users meet min_total_karma filter",
      statsPage.data.every((x) => x.total_karma >= minKarma),
    );

  // 4. Validate result shape and data privacy (no extra user info, only stats)
  statsPage.data.forEach((stat, idx) => {
    typia.assert<ICommunityPlatformKarmaStats>(stat);
    TestValidator.predicate(
      `karmaStat #${idx} fields match schema (PII safe)`,
      Object.keys(stat).every((key) =>
        [
          "id",
          "community_platform_user_id",
          "total_karma",
          "post_karma",
          "comment_karma",
          "lifetime_karma",
          "maximum_karma",
          "created_at",
          "updated_at",
        ].includes(key),
      ),
    );
  });

  // 5. Confirm only admins can access this endpoint
  // Try with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated users cannot retrieve karma stats",
    async () => {
      await api.functional.communityPlatform.admin.karmaStats.index(
        unauthConn,
        {
          body: searchBody,
        },
      );
    },
  );
}
