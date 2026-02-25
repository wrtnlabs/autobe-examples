import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSystemOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSystemOverview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardSystemOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSystemOverview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_system_overview_structure_schema(
  connection: api.IConnection,
): Promise<void> {
  // Create citizen actor connection
  const citizenConnection: api.IConnection = { host: connection.host };
  // 1. Essential prerequisite: Register citizen user
  const authorizedCitizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(authorizedCitizen);
  // 2. Update connection with authorization token for subsequent calls
  citizenConnection.headers = { Authorization: authorizedCitizen.token.access };
  // 3. Call system overview endpoint with empty IRequest body (as required)
  const response = await api.functional.economicBoard.citizen.index(
    citizenConnection,
    {
      body: {} satisfies IEconomicBoardSystemOverview.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate the complete structure against IPageIEconomicBoardSystemOverview schema
  TestValidator.equals("pagination structure", response.pagination, {
    current: 1,
    limit: 1,
    records: 1,
    pages: 1,
  });
  // 5. Validate data array contains exactly one item
  TestValidator.equals("data array length", response.data.length, 1);
  // 6. Validate system overview properties
  const systemOverview = response.data[0];
  // 7. Version must be a non-empty string following semantic versioning
  TestValidator.predicate("version is non-empty string", () => {
    return (
      typeof systemOverview.version === "string" &&
      systemOverview.version.length > 0
    );
  });
  // 8. Status must be the literal string 'online'
  TestValidator.equals("status is 'online'", systemOverview.status, "online");
  // 9. Links must be a non-null object with string values
  TestValidator.predicate("links is non-null object", () => {
    return (
      systemOverview.links !== null &&
      typeof systemOverview.links === "object" &&
      systemOverview.links !== undefined
    );
  });
  // 10. Validate that links object has expected keys (as per spec)
  const expectedLinkKeys = [
    "authRegister",
    "authLogin",
    "sections",
    "articles",
    "users",
    "adminSections",
    "adminUsers",
    "adminBannedUsers",
    "adminRequests",
  ];
  // Check that all expected keys exist and have string values
  for (const key of expectedLinkKeys) {
    TestValidator.predicate(`link ${key} exists and is string`, () => {
      return (
        systemOverview.links.hasOwnProperty(key) &&
        typeof systemOverview.links[key] === "string" &&
        systemOverview.links[key].length > 0
      );
    });
  }
}
