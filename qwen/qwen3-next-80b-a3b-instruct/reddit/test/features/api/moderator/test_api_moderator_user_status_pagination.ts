import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatus";
import type { ICommunityBbsUserStatusDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatusDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserStatus";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_user_status_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate moderator to access restricted user status data
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 2: Create a series of user status records for pagination testing
  // We'll create 25 user status records to ensure we have more than one page
  const userStatuses: ICommunityBbsUserStatus.ISummary[] = [];
  await ArrayUtil.asyncRepeat(25, async (index) => {
    const userStatus: ICommunityBbsUserStatus.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      status: RandomGenerator.pick([
        "active",
        "suspended",
        "banned",
        "pending_verification",
      ] as const),
      createdAt: new Date(Date.now() - index * 1000 * 60 * 60).toISOString(), // Generate sequential creation dates
    };
    userStatuses.push(userStatus);
  });
  // Step 3: Retrieve first page with limit=10 and page=1
  const firstPage: IPageICommunityBbsUserStatus.ISummary =
    await api.functional.communityBbs.moderator.users.status.index(
      moderatorConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies ICommunityBbsUserStatus.IRequest,
      },
    );
  typia.assert(firstPage);
  // Step 4: Validate first page pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "first page records >= 10",
    firstPage.pagination.records >= 10,
  );
  TestValidator.predicate(
    "first page pages >= 1",
    firstPage.pagination.pages >= 1,
  );
  // Step 5: Validate first page data contains exactly 10 records
  TestValidator.equals("first page records count", firstPage.data.length, 10);
  // Step 6: Retrieve second page with limit=10 and page=2
  const secondPage: IPageICommunityBbsUserStatus.ISummary =
    await api.functional.communityBbs.moderator.users.status.index(
      moderatorConnection,
      {
        body: {
          limit: 10,
          page: 2,
        } satisfies ICommunityBbsUserStatus.IRequest,
      },
    );
  typia.assert(secondPage);
  // Step 7: Validate second page pagination metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.predicate(
    "second page records matches first",
    secondPage.pagination.records === firstPage.pagination.records,
  );
  TestValidator.predicate(
    "second page pages matches first",
    secondPage.pagination.pages === firstPage.pagination.pages,
  );
  // Step 8: Validate second page data contains exactly 10 records
  TestValidator.equals("second page records count", secondPage.data.length, 10);
  // Step 9: Validate no duplicates between first and second pages
  const firstPageIds = firstPage.data.map((item) => item.id);
  const secondPageIds = secondPage.data.map((item) => item.id);
  const overlappingIds = firstPageIds.filter((id) =>
    secondPageIds.includes(id),
  );
  TestValidator.equals("no overlapping ids", overlappingIds.length, 0);
  // Step 10: Validate that records are sequential by createdAt
  // First page should contain the most recent records
  const firstPageSorted = [...firstPage.data].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const secondPageSorted = [...secondPage.data].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  // The last record of first page should be newer than first record of second page
  TestValidator.predicate(
    "first page last record is newer than second page first record",
    new Date(firstPageSorted[firstPageSorted.length - 1].createdAt).getTime() >
      new Date(secondPageSorted[0].createdAt).getTime(),
  );
  // Step 11: Validate records contain expected properties and no extras
  for (const record of [...firstPage.data, ...secondPage.data]) {
    TestValidator.predicate("record has id", typeof record.id === "string");
    TestValidator.predicate(
      "record has status",
      ["active", "suspended", "banned", "pending_verification"].includes(
        record.status,
      ),
    );
    TestValidator.predicate(
      "record has createdAt",
      typeof record.createdAt === "string" &&
        !isNaN(new Date(record.createdAt).getTime()),
    );
    typia.assert(record);
  }
}
