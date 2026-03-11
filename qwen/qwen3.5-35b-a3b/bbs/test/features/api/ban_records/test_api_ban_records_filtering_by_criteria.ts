import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_ban_records_filtering_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with token
  const adminAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 3. Test filter by userId (if ban records exist for a specific user)
  const testUserId = typia.random<string & tags.Format<"uuid">>();
  const userIdResponse =
    await api.functional.economicPoliticalBoard.admin.bans.index(
      adminAuthorizedConnection,
      {
        body: {
          userId: testUserId,
          sortBy: "newest",
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(userIdResponse);
  // 4. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.economicPoliticalBoard.admin.bans.index(
      adminAuthorizedConnection,
      {
        body: {
          createdAtFrom: oneWeekAgo.toISOString(),
          createdAtTo: oneDayLater.toISOString(),
          sortBy: "newest",
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // 5. Test reason keyword filtering (case-insensitive partial match)
  const randomKeyword = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 3,
  });
  const keywordResponse =
    await api.functional.economicPoliticalBoard.admin.bans.index(
      adminAuthorizedConnection,
      {
        body: {
          reasonKeyword: randomKeyword,
          sortBy: "newest",
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(keywordResponse);
  // 6. Test combined filters
  const combinedResponse =
    await api.functional.economicPoliticalBoard.admin.bans.index(
      adminAuthorizedConnection,
      {
        body: {
          userId: testUserId,
          createdAtFrom: oneWeekAgo.toISOString(),
          reasonKeyword: randomKeyword,
          sortBy: "newest",
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // 7. Test sorting by oldest
  const oldestResponse =
    await api.functional.economicPoliticalBoard.admin.bans.index(
      adminAuthorizedConnection,
      {
        body: {
          sortBy: "oldest",
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(oldestResponse);
  // 8. Verify pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    userIdResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    userIdResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    userIdResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    userIdResponse.pagination.pages >= 0,
  );
}
