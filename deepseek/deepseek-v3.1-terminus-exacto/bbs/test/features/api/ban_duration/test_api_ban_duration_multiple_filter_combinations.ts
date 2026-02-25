import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_ban_duration_multiple_filter_combinations(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test Case 1: Text search with duration range filtering for temporary bans
  const tempSearchWithDuration =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: "temporary",
          duration_hours: {
            min: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
            max: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
            >(),
          },
          is_permanent: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(tempSearchWithDuration);
  // Test Case 2: Permanent bans with name pattern search
  const permSearch =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: "permanent",
          is_permanent: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(permSearch);
  // Test Case 3: All three filter types combined
  const combinedFilters =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: "ban",
          duration_hours: {
            min: typia.random<number & tags.Type<"int32"> & tags.Minimum<24>>(),
            max: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<168> &
                tags.Maximum<720>
            >(),
          },
          is_permanent: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // Test Case 4: Duration range only (no search text)
  const durationOnly =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          duration_hours: {
            min: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
            max: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<12> & tags.Maximum<48>
            >(),
          },
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(durationOnly);
  // Test Case 5: Permanent status filter only
  const permanentOnly =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          is_permanent: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(permanentOnly);
  // Validate basic response structure without assuming specific pagination properties
  TestValidator.predicate(
    "response has pagination property",
    tempSearchWithDuration.pagination !== undefined,
  );
  TestValidator.predicate(
    "data is array",
    Array.isArray(tempSearchWithDuration.data),
  );
  // Validate ban duration summary structure
  if (tempSearchWithDuration.data.length > 0) {
    const sample = tempSearchWithDuration.data[0];
    TestValidator.predicate(
      "ban duration has id",
      typeof sample.id === "string",
    );
    TestValidator.predicate(
      "ban duration has name",
      typeof sample.name === "string",
    );
    TestValidator.predicate(
      "ban duration has duration_hours",
      typeof sample.duration_hours === "number",
    );
    TestValidator.predicate(
      "ban duration has is_permanent",
      typeof sample.is_permanent === "boolean",
    );
  }
}
