import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardContentFlag";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardContentFlag";

export async function test_api_content_flag_list_retrieval_by_moderator(
  connection: api.IConnection,
) {
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(moderator);

  const contentFlags: IPageIEconomicBoardContentFlag =
    await api.functional.economicBoard.moderator.settings.contentFlags.index(
      connection,
    );
  typia.assert(contentFlags);

  TestValidator.equals(
    "pagination current page is 1",
    contentFlags.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    contentFlags.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    contentFlags.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    contentFlags.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array is not empty",
    contentFlags.data.length > 0,
  );

  for (const flag of contentFlags.data) {
    TestValidator.predicate("flag is a string", typeof flag === "string");
  }
}
