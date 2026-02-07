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

export async function test_api_user_search_pagination(
  connection: api.IConnection,
) {
  // 1. User registration
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {} satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. First page retrieval
  const firstPageResult =
    await api.functional.economyPoliticsBoard.user.queries.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEconomyPoliticsBoardSearchQuery.IRequest,
      },
    );
  typia.assert(firstPageResult);
  // 3. Second page retrieval
  const secondPageResult =
    await api.functional.economyPoliticsBoard.user.queries.index(
      userConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEconomyPoliticsBoardSearchQuery.IRequest,
      },
    );
  typia.assert(secondPageResult);
  // 4. Validation
  TestValidator.equals(
    "total records count matches",
    firstPageResult.pagination.records,
    secondPageResult.pagination.records,
  );
  TestValidator.equals("first page data count", firstPageResult.data.length, 5);
  TestValidator.equals(
    "second page data count",
    secondPageResult.data.length,
    5,
  );
}
