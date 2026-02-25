import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_section_browse_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Test search functionality with various search terms
  const searchTests = [
    { search: "Tech", description: "partial section name search" },
    { search: "Politics", description: "another partial section name search" },
    { search: "", description: "empty search returning all sections" },
    {
      search: "XYZ123UnlikelyToMatch",
      description: "search term with no matches",
    },
  ];
  for (const test of searchTests) {
    const result = await api.functional.discussionBoard.user.browse.index(
      userConnection,
      {
        body: {
          search: test.search,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
    typia.assert(result);
    // Validate that pagination structure exists and has basic properties
    TestValidator.predicate(
      `${test.description} has pagination object`,
      result.pagination !== null && result.pagination !== undefined,
    );
    // Validate that data array exists
    TestValidator.predicate(
      `${test.description} has data array`,
      Array.isArray(result.data),
    );
  }
  // Test pagination with different page sizes
  const paginationSizes = [1, 5, 10] as const;
  for (const limit of paginationSizes) {
    const result = await api.functional.discussionBoard.user.browse.index(
      userConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: limit satisfies number as number,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
    typia.assert(result);
    // Validate basic pagination structure without accessing non-existent properties
    TestValidator.predicate(
      `pagination with limit ${limit} has valid structure`,
      result.pagination !== null &&
        result.pagination !== undefined &&
        Array.isArray(result.data),
    );
  }
  // Test that sections returned have valid structure
  const allSections = await api.functional.discussionBoard.user.browse.index(
    userConnection,
    {
      body: {
        search: "",
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(allSections);
  if (allSections.data.length > 0) {
    const sampleSection = allSections.data[0];
    // typia.assert() already validated all properties, so we only test business logic
    TestValidator.predicate(
      "sample section has non-empty name",
      sampleSection.name.length > 0,
    );
    TestValidator.predicate(
      "sample section has non-empty description",
      sampleSection.description.length > 0,
    );
    TestValidator.predicate(
      "sample section has valid display order",
      sampleSection.display_order >= 0,
    );
  }
}
