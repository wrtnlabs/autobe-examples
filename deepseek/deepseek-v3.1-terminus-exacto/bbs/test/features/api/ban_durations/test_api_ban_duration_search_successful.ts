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

/**
 * Test super administrator searching for ban duration options with various filtering criteria.
 */
export async function test_api_ban_duration_search_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Test search by text
  const searchText = RandomGenerator.substring(
    RandomGenerator.paragraph({ sentences: 3 }),
  );
  const textSearchResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: searchText,
        },
      },
    );
  typia.assert(textSearchResult);
  // Access the correct pagination properties through the nested structure
  TestValidator.predicate(
    "text search returns pagination",
    textSearchResult.pagination.pagination.pagination.pagination.records >= 0,
  );
  // 3. Test temporary bans only
  const tempResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          is_permanent: false,
        },
      },
    );
  typia.assert(tempResult);
  TestValidator.predicate(
    "temporary bans result",
    tempResult.data.every((item) => item.is_permanent === false),
  );
  if (tempResult.data.length > 0) {
    TestValidator.predicate(
      "temporary ban duration hours non-negative",
      tempResult.data.every((item) => item.duration_hours >= 0),
    );
  }
  // 4. Test permanent bans only
  const permResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          is_permanent: true,
        },
      },
    );
  typia.assert(permResult);
  TestValidator.predicate(
    "permanent bans result",
    permResult.data.every((item) => item.is_permanent === true),
  );
  if (permResult.data.length > 0) {
    TestValidator.predicate(
      "permanent ban duration hours non-negative",
      permResult.data.every((item) => item.duration_hours >= 0),
    );
  }
  // 5. Test duration range filtering
  const durationMin = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const durationMax = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const durationResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          duration_hours: {
            min: durationMin satisfies number as number,
            max: durationMax satisfies number as number,
          },
        },
      },
    );
  typia.assert(durationResult);
  if (durationResult.data.length > 0) {
    TestValidator.predicate(
      "duration range filtering works",
      durationResult.data.every(
        (item) =>
          item.duration_hours >= durationMin &&
          item.duration_hours <= durationMax,
      ),
    );
  }
  // 6. Test pagination parameters
  const page = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const paginationResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          page: page satisfies number as number,
          limit: limit satisfies number as number,
        },
      },
    );
  typia.assert(paginationResult);
  // Access the correct nested pagination properties
  TestValidator.equals(
    "page matches requested",
    paginationResult.pagination.pagination.pagination.pagination.current,
    page,
  );
  TestValidator.equals(
    "limit matches requested",
    paginationResult.pagination.pagination.pagination.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginationResult.data.length <= limit,
  );
  // 7. Test combined filters
  const combinedResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: RandomGenerator.substring(
            RandomGenerator.paragraph({ sentences: 2 }),
          ),
          is_permanent: false,
          duration_hours: {
            min: 1 satisfies number as number,
            max: 24 satisfies number as number,
          },
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        },
      },
    );
  typia.assert(combinedResult);
  if (combinedResult.data.length > 0) {
    TestValidator.predicate(
      "combined filters - temporary only",
      combinedResult.data.every((item) => item.is_permanent === false),
    );
    TestValidator.predicate(
      "combined filters - duration range",
      combinedResult.data.every(
        (item) => item.duration_hours >= 1 && item.duration_hours <= 24,
      ),
    );
  }
}
