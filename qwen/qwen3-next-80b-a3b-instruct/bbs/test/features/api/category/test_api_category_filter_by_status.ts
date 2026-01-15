import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_category_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Step 2: Verify that querying without status parameter returns only active categories
  const resultWithoutStatus =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(resultWithoutStatus);
  // Validate that all returned categories have status 'active' (citizen role restriction)
  TestValidator.predicate(
    "all categories are active when no status filter specified",
    () =>
      resultWithoutStatus.data.every(
        (category) => category.status === "active",
      ),
  );
  // Step 3: Verify that explicitly requesting status:'inactive' returns no results for citizen role
  const resultWithInactive =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "inactive",
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(resultWithInactive);
  // Validate that no categories are returned when explicitly filtering for inactive status
  TestValidator.equals(
    "no categories returned with explicit status:'inactive' filter",
    resultWithInactive.data.length,
    0,
  );
}
