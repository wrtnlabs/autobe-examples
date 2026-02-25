import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleView";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_activity_metrics_with_no_data(
  connection: api.IConnection,
): Promise<void> {
  // Create citizen connection for authentication
  const citizenConnection: api.IConnection = { host: connection.host };
  // Join as citizen to establish authentication context
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // Call the activity metrics endpoint
  const response: IPageIEconomicBoardArticleView =
    await api.functional.economicBoard.citizen.reports.activity.index(
      citizenConnection,
    );
  // Validate response structure and values
  typia.assert(response);
  // Verify pagination properties
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
  // Verify data array is empty
  TestValidator.equals("data array length", response.data.length, 0);
  // Since the endpoint returns aggregated metrics, without any data it should
  // contain zero values for all activity metrics
  // Note: The service may return these metrics as part of the response
  //       but they are not explicitly defined in the DTO. We must validate
  //       based on the provided DTO which is IPageIEconomicBoardArticleView.
  //       This DTO doesn't contain DAU/WAU/MAU directly, only pagination and data.
  //       Based on the scenario, we're validating what's explicitly defined in the DTO.
}
