import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerator";

export async function test_api_moderator_list_retrieval_default(
  connection: api.IConnection,
) {
  const moderator1: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator1);

  const moderator2: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password456",
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator2);

  const moderator3: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password789",
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator3);

  const pageResult: IPageIEconomicBoardModerator.ISummary =
    await api.functional.economicBoard.moderator.moderators.index(connection, {
      body: {} satisfies IEconomicBoardModerator.IRequest,
    });
  typia.assert(pageResult);

  // Validate pagination structure as per schema
  TestValidator.equals(
    "pagination structure type",
    typeof pageResult.pagination,
    "object",
  );
  TestValidator.equals(
    "current property type",
    typeof pageResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "limit property type",
    typeof pageResult.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "records property type",
    typeof pageResult.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pages property type",
    typeof pageResult.pagination.pages,
    "number",
  );

  // Validate data structure as per schema - IEconomicBoardModerator.ISummary is defined as string
  TestValidator.equals("data array type", Array.isArray(pageResult.data), true);
  TestValidator.equals(
    "data array not empty",
    pageResult.data.length > 0,
    true,
  );

  // Validate that each data element conforms to IEconomicBoardModerator.ISummary type (string)
  for (const summary of pageResult.data) {
    TestValidator.equals("summary element type", typeof summary, "string");
  }
}
