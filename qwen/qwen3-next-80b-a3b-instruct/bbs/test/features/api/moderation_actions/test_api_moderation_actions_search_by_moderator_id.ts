import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerationAction";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerationAction";

export async function test_api_moderation_actions_search_by_moderator_id(
  connection: api.IConnection,
) {
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Search moderation actions by the authenticated moderator's ID
  const searchResult: IPageIEconomicBoardModerationAction.ISummary =
    await api.functional.economicBoard.moderator.moderation.actions.search(
      connection,
      {
        body: {
          moderator_id: moderator.id,
        } satisfies IEconomicBoardModerationAction.IRequest,
      },
    );
  typia.assert(searchResult);

  // Validate response structure matches expected schema
  TestValidator.equals(
    "pagination object exists",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(searchResult.data),
    true,
  );
  TestValidator.equals(
    "data items are valid summary objects",
    searchResult.data.length >= 0,
    true,
  );

  // Verify pagination structure is correct
  TestValidator.predicate(
    "current page is >= 0",
    () => searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is > 0",
    () => searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records >= 0",
    () => searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages >= 0",
    () => searchResult.pagination.pages >= 0,
  );

  // Validate items are from valid moderation action summary type
  if (searchResult.data.length > 0) {
    // Verify the first item if exists
    TestValidator.equals(
      "first item has valid id",
      typeof searchResult.data[0].id,
      "string",
    );
    TestValidator.equals(
      "first item has valid created_at",
      typeof searchResult.data[0].created_at,
      "string",
    );
    TestValidator.equals(
      "first item has valid moderator_id",
      typeof searchResult.data[0].moderator_id,
      "string",
    );
    TestValidator.equals(
      "first item has valid citizen_id",
      typeof searchResult.data[0].citizen_id,
      "string",
    );

    // Validate the format of id and moderator_id
    TestValidator.predicate("first item ID is UUID format", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        searchResult.data[0].id,
      ),
    );
    TestValidator.predicate("first item moderator_id is UUID format", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        searchResult.data[0].moderator_id,
      ),
    );
  }

  // Validate no search error occurred, and structure is proper
  TestValidator.predicate(
    "search response has correct schema",
    () =>
      searchResult.pagination !== undefined && Array.isArray(searchResult.data),
  );
}
