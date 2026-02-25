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

export async function test_api_citizen_activity_metrics_admin_request_context(
  connection: api.IConnection,
): Promise<void> {
  // Create a citizen user using utility function (mandatory)
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizen);
  // Call the activity metrics endpoint - no authorization token needed as per specification
  // The endpoint is publicly accessible to citizens (x-autobe-authorization-actor: citizen)
  // Use SDK function since no utility function exists for PATCH /economicBoard/citizen/reports/activity
  const activity =
    await api.functional.economicBoard.citizen.reports.activity.index(
      citizenConnection,
    );
  typia.assert(activity);
}
