import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator list retrieval with pagination.
 *
 * This test verifies the pagination functionality for retrieving administrator
 * accounts from the discussion board platform. It tests page navigation,
 * pagination metadata accuracy, and ensures administrator summaries contain
 * the correct fields without sensitive data.
 */
export async function test_api_administrator_list_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  // 2. Test page 1 retrieval with limit=10
  const page1Request = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAdministrator.IRequest;
  const page1Response =
    await api.functional.discussionBoard.administrators.index(adminConnection, {
      body: page1Request,
    });
  typia.assert(page1Response);
  // 3. Verify pagination metadata for page 1
  TestValidator.equals(
    "page 1 current equals 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit equals 10",
    page1Response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 records is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages calculation is correct",
    page1Response.pagination.pages ===
      Math.ceil(
        page1Response.pagination.records / page1Response.pagination.limit,
      ),
  );
  // 4. Verify data array contains administrator summaries
  TestValidator.predicate(
    "page 1 data is an array",
    Array.isArray(page1Response.data),
  );
  TestValidator.predicate(
    "page 1 data length does not exceed limit",
    page1Response.data.length <= page1Response.pagination.limit,
  );
  // 5. Verify each administrator summary has required fields (business logic)
  for (const admin of page1Response.data) {
    typia.assert(admin);
    TestValidator.predicate(
      `administrator ${admin.id} has valid grade`,
      admin.grade === "regular" || admin.grade === "super",
    );
  }
  // 6. Test page 2 retrieval (if there are enough records)
  if (page1Response.pagination.pages >= 2) {
    const page2Request = {
      page: 2,
      limit: 10,
    } satisfies IDiscussionBoardAdministrator.IRequest;
    const page2Response =
      await api.functional.discussionBoard.administrators.index(
        adminConnection,
        {
          body: page2Request,
        },
      );
    typia.assert(page2Response);
    // 7. Verify pagination metadata for page 2
    TestValidator.equals(
      "page 2 current equals 2",
      page2Response.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit equals 10",
      page2Response.pagination.limit,
      10,
    );
    TestValidator.equals(
      "page 2 records matches page 1",
      page2Response.pagination.records,
      page1Response.pagination.records,
    );
    TestValidator.equals(
      "page 2 pages matches page 1",
      page2Response.pagination.pages,
      page1Response.pagination.pages,
    );
    // 8. Verify page 2 returns different administrators
    const page1Ids = new Set(page1Response.data.map((a) => a.id));
    const page2Ids = new Set(page2Response.data.map((a) => a.id));
    const hasOverlap = Array.from(page2Ids).some((id) => page1Ids.has(id));
    TestValidator.predicate(
      "page 2 contains different administrators than page 1",
      !hasOverlap,
    );
    // 9. Verify each administrator in page 2 has valid grade
    for (const admin of page2Response.data) {
      typia.assert(admin);
      TestValidator.predicate(
        `page 2 administrator ${admin.id} has valid grade`,
        admin.grade === "regular" || admin.grade === "super",
      );
    }
  }
}
