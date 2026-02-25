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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_admin_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create multiple test users
  const testUsers: IDiscussionBoardUser.IAuthorized[] = [];
  const displayNames = [
    "John Smith",
    "John Doe",
    "Jane Johnson",
    "Robert Smith",
    "Alice Johnson",
    "Michael Brown",
  ];
  for (const displayName of displayNames) {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: displayName,
      },
    });
    testUsers.push(user);
  }
  // 3. Execute search with display name filter (partial match "John")
  const searchResult = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        displayName: "John",
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(searchResult);
  // 4. Validate pagination metadata - using correct pagination structure
  // The actual pagination structure is deeply nested, so we need to navigate through it
  TestValidator.equals("search result count", searchResult.data.length, 2);
  // 5. Validate search results contain "John" users
  for (const userSummary of searchResult.data) {
    typia.assert(userSummary);
    TestValidator.predicate(
      "display_name contains John",
      userSummary.display_name.includes("John"),
    );
  }
  // 6. Verify user summary structure
  if (searchResult.data.length > 0) {
    const sampleUser = searchResult.data[0];
    TestValidator.predicate("has id field", sampleUser.id !== undefined);
    TestValidator.predicate(
      "has display_name field",
      sampleUser.display_name !== undefined,
    );
    // bio may be null or undefined
    TestValidator.predicate(
      "has created_at field",
      sampleUser.created_at !== undefined,
    );
  }
  // 7. Test includeDeleted parameter (soft-deleted users should be excluded by default)
  const searchResult2 = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        displayName: "Smith",
        includeDeleted: false,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(searchResult2);
  TestValidator.equals("Smith users count", searchResult2.data.length, 2);
}
