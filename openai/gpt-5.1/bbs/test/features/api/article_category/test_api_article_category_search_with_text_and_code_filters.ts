import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

export async function test_api_article_category_search_with_text_and_code_filters(
  connection: api.IConnection,
) {
  /**
   * 1. Register and authenticate an admin user so we can create category master
   *    data via admin-only endpoints.
   */
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin#1234" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: "https://admin.discussion-board.test/join" as string &
      tags.Format<"uri">,
    referrer: "https://admin.discussion-board.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorized);

  /**
   * 2. Seed three categories with controlled codes, names, and descriptions.
   *
   *    - ECONOMY: description contains "finance"
   *    - POLITICS: description does not contain "finance" or "local"
   *    - LOCAL: description contains "local" but not "finance"
   */
  const economyCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: {
          code: "ECONOMY",
          name: "Economy",
          description:
            "Topics about global and domestic finance, economic policy, and markets.",
          order: 1 as number & tags.Type<"int32">,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(economyCategory);

  const politicsCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: {
          code: "POLITICS",
          name: "Politics",
          description:
            "Discussions on elections, government decisions, and political parties.",
          order: 2 as number & tags.Type<"int32">,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(politicsCategory);

  const localCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: {
          code: "LOCAL",
          name: "Local Issues",
          description:
            "Conversations about local topics, community events, and neighborhood news.",
          order: 3 as number & tags.Type<"int32">,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(localCategory);

  /**
   * 3. Text search: search = "finance" (no codes filter). Expectation: only
   *    ECONOMY is returned because it mentions "finance".
   */
  const financeSearchResponse: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articleCategories.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        search: "finance",
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(financeSearchResponse);

  const financeCodes = financeSearchResponse.data.map((c) => c.code);

  // Must contain ECONOMY
  TestValidator.predicate(
    "finance search should include ECONOMY category",
    financeCodes.includes("ECONOMY"),
  );

  // Must not contain POLITICS or LOCAL
  TestValidator.predicate(
    "finance search should not include POLITICS category",
    financeCodes.includes("POLITICS") === false,
  );
  TestValidator.predicate(
    "finance search should not include LOCAL category",
    financeCodes.includes("LOCAL") === false,
  );

  /**
   * 4. Codes filter only: codes = ["POLITICS", "LOCAL"], search = null.
   *    Expectation: only POLITICS and LOCAL categories appear, ECONOMY
   *    excluded.
   */
  const codesOnlyResponse: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articleCategories.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        search: null,
        codes: ["POLITICS", "LOCAL"],
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(codesOnlyResponse);

  const codesOnlyCodes = codesOnlyResponse.data.map((c) => c.code);

  // All returned codes must be in the allowed set {POLITICS, LOCAL}
  const allCodesAreInFilter = codesOnlyCodes.every((code) =>
    ["POLITICS", "LOCAL"].includes(code),
  );
  TestValidator.predicate(
    "codes-only filter should return only POLITICS and LOCAL codes",
    allCodesAreInFilter,
  );

  // ECONOMY must not be present
  TestValidator.predicate(
    "codes-only filter should exclude ECONOMY",
    codesOnlyCodes.includes("ECONOMY") === false,
  );

  // Ensure both POLITICS and LOCAL are present at least once
  TestValidator.predicate(
    "codes-only filter should include POLITICS",
    codesOnlyCodes.includes("POLITICS"),
  );
  TestValidator.predicate(
    "codes-only filter should include LOCAL",
    codesOnlyCodes.includes("LOCAL"),
  );

  /**
   * 5. Combined filters: codes = ["POLITICS", "LOCAL"], search = "local".
   *    Expectation: intersection semantics, only LOCAL should be returned.
   */
  const combinedResponse: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articleCategories.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        search: "local",
        codes: ["POLITICS", "LOCAL"],
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(combinedResponse);

  const combinedCodes = combinedResponse.data.map((c) => c.code);

  // All returned codes must be LOCAL only (due to intersection of search and codes)
  const allCombinedAreLocal =
    combinedCodes.length === 0
      ? false
      : combinedCodes.every((code) => code === "LOCAL");
  TestValidator.predicate(
    "combined filter should return only LOCAL category",
    allCombinedAreLocal,
  );

  // Explicitly assert that POLITICS is not present in combined results
  TestValidator.predicate(
    "combined filter should exclude POLITICS category",
    combinedCodes.includes("POLITICS") === false,
  );
}
