import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchQuery";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardSearchQuery";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_search_empty_term_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: typia.random<IEconomyPoliticsBoardUser.IJoin>(),
  });
  // 2. Call the search endpoint with empty term
  const response: IPageIEconomyPoliticsBoardSearchQuery.ISummary =
    await api.functional.economyPoliticsBoard.user.queries.index(
      userConnection,
      {
        body: typia.random<IEconomyPoliticsBoardSearchQuery.IRequest>(),
      },
    );
  typia.assert(response);
  // 3. Validate results are present and ordered
  TestValidator.predicate(
    "results should not be empty",
    response.data.length > 0,
  );
  // Validate ordering: most recent first
  if (response.data.length > 0) {
    const firstItem = response.data[0];
    // Check the first item's created_at is after the second if exists
    if (response.data.length >= 2) {
      const secondItem = response.data[1];
      TestValidator.predicate(
        "results ordered by date descending",
        firstItem.created_at > secondItem.created_at,
      );
    }
    // Check the first item is within last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const firstItemDate = new Date(firstItem.created_at);
    TestValidator.predicate(
      "first item is within last 7 days",
      firstItemDate >= sevenDaysAgo,
    );
  }
}
