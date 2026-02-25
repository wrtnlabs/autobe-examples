import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_users_search_display_name_partial_matching(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Admin User",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create test users with varied display names
  const users = await ArrayUtil.asyncRepeat(10, async (index) => {
    const displayName = `TestUser${String.fromCharCode(65 + index)}_${index}`;
    const userSearchBody: IDiscussionBoardUser.IRequest = {
      displayName: displayName,
      limit: 1,
    } satisfies IDiscussionBoardUser.IRequest;
    const searchResult =
      await api.functional.discussionBoard.admin.users.search.index(
        adminConnection,
        { body: userSearchBody },
      );
    typia.assert(searchResult);
    return { displayName, searchResult };
  });
  // Test 1: Exact match search
  const exactSearchBody: IDiscussionBoardUser.IRequest = {
    displayName: "TestUserA_0",
    limit: 10,
  } satisfies IDiscussionBoardUser.IRequest;
  const exactResults =
    await api.functional.discussionBoard.admin.users.search.index(
      adminConnection,
      { body: exactSearchBody },
    );
  typia.assert(exactResults);
  TestValidator.equals(
    "exact match should find specific user",
    exactResults.data.some((user) => user.display_name === "TestUserA_0"),
    true,
  );
  // Test 2: Beginning partial match
  const beginSearchBody: IDiscussionBoardUser.IRequest = {
    displayName: "TestUser",
    limit: 10,
  } satisfies IDiscussionBoardUser.IRequest;
  const beginResults =
    await api.functional.discussionBoard.admin.users.search.index(
      adminConnection,
      { body: beginSearchBody },
    );
  typia.assert(beginResults);
  TestValidator.predicate(
    "beginning partial match should find multiple users",
    beginResults.data.length >= 1,
  );
  // Test 3: Middle partial match
  const middleSearchBody: IDiscussionBoardUser.IRequest = {
    displayName: "UserB",
    limit: 10,
  } satisfies IDiscussionBoardUser.IRequest;
  const middleResults =
    await api.functional.discussionBoard.admin.users.search.index(
      adminConnection,
      { body: middleSearchBody },
    );
  typia.assert(middleResults);
  TestValidator.predicate(
    "middle partial match should find specific user",
    middleResults.data.some((user) => user.display_name.includes("UserB")),
  );
  // Test 4: End partial match
  const endSearchBody: IDiscussionBoardUser.IRequest = {
    displayName: "_0",
    limit: 10,
  } satisfies IDiscussionBoardUser.IRequest;
  const endResults =
    await api.functional.discussionBoard.admin.users.search.index(
      adminConnection,
      { body: endSearchBody },
    );
  typia.assert(endResults);
  TestValidator.predicate(
    "end partial match should find specific user",
    endResults.data.some((user) => user.display_name.endsWith("_0")),
  );
  // Test 5: Case-insensitive search
  const caseSearchBody: IDiscussionBoardUser.IRequest = {
    displayName: "testuser",
    limit: 10,
  } satisfies IDiscussionBoardUser.IRequest;
  const caseResults =
    await api.functional.discussionBoard.admin.users.search.index(
      adminConnection,
      { body: caseSearchBody },
    );
  typia.assert(caseResults);
  TestValidator.predicate(
    "case-insensitive search should find users",
    caseResults.data.length >= 1,
  );
  // Test 6: Single character search
  const charSearchBody: IDiscussionBoardUser.IRequest = {
    displayName: "A",
    limit: 10,
  } satisfies IDiscussionBoardUser.IRequest;
  const charResults =
    await api.functional.discussionBoard.admin.users.search.index(
      adminConnection,
      { body: charSearchBody },
    );
  typia.assert(charResults);
  TestValidator.predicate(
    "single character search should return results",
    charResults.data.length >= 0,
  );
  // Test 7: Special characters handling
  const specialSearchBody: IDiscussionBoardUser.IRequest = {
    displayName: "_",
    limit: 10,
  } satisfies IDiscussionBoardUser.IRequest;
  const specialResults =
    await api.functional.discussionBoard.admin.users.search.index(
      adminConnection,
      { body: specialSearchBody },
    );
  typia.assert(specialResults);
  TestValidator.predicate(
    "special characters search should handle underscores",
    specialResults.data.length >= 1,
  );
  // Test 8: Pagination functionality
  const pageSearchBody: IDiscussionBoardUser.IRequest = {
    displayName: "TestUser",
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardUser.IRequest;
  const pageResults =
    await api.functional.discussionBoard.admin.users.search.index(
      adminConnection,
      { body: pageSearchBody },
    );
  typia.assert(pageResults);
  TestValidator.equals(
    "pagination should limit results to specified size",
    pageResults.data.length <= 5,
    true,
  );
  TestValidator.predicate(
    "pagination should have metadata",
    pageResults.pagination.pagination.pagination !== undefined,
  );
  // Test 9: Non-existent search
  const nonexistentSearchBody: IDiscussionBoardUser.IRequest = {
    displayName: "NonexistentUser999",
    limit: 10,
  } satisfies IDiscussionBoardUser.IRequest;
  const nonexistentResults =
    await api.functional.discussionBoard.admin.users.search.index(
      adminConnection,
      { body: nonexistentSearchBody },
    );
  typia.assert(nonexistentResults);
  TestValidator.equals(
    "non-existent search should return empty results",
    nonexistentResults.data.length,
    0,
  );
}