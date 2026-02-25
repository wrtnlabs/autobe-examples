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

export async function test_api_system_overview_success(
  connection: api.IConnection,
): Promise<void> {
  // The system overview endpoint is publicly accessible without authentication
  // No actor-specific connections needed as no authorization is required
  // Call the system overview endpoint with empty request body as specified
  const response = await api.functional.economicBoard.citizen.index(
    connection,
    {
      body: {} satisfies IEconomicBoardSystemOverview.IRequest,
    },
  );
  typia.assert(response);
  // Validate that response has exactly one system overview object
  TestValidator.equals("pagination", response.pagination.current, 1);
  TestValidator.equals("pagination", response.pagination.limit, 100);
  TestValidator.equals("pagination", response.pagination.records, 1);
  TestValidator.equals("pagination", response.pagination.pages, 1);
  // Validate the system overview data object
  const overview = response.data[0];
  // Validate version is a semantic version string
  TestValidator.predicate(
    "version is semantic",
    /^\d+\.\d+\.\d+$/.test(overview.version),
  );
  // Validate status is exactly 'online'
  TestValidator.equals("status", overview.status, "online");
  // Validate exactly 9 hypermedia links exist
  const requiredLinks = [
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
  TestValidator.equals(
    "number of links",
    Object.keys(overview.links).length,
    9,
  );
  // Validate each required link exists and is a non-empty string
  for (const linkKey of requiredLinks) {
    TestValidator.predicate(
      `link ${linkKey} exists`,
      linkKey in overview.links,
    );
    TestValidator.predicate(
      `link ${linkKey} is non-empty string`,
      typeof overview.links[linkKey] === "string" &&
        overview.links[linkKey].length > 0,
    );
    // Verify the link URL format (contains protocol like http:// or https://)
    TestValidator.predicate(
      `link ${linkKey} is valid URL`,
      overview.links[linkKey].startsWith("http://") ||
        overview.links[linkKey].startsWith("https://"),
    );
  }
  // Ensure no additional properties exist in the overview object
  const keys = Object.keys(overview);
  TestValidator.equals("exact structure", keys.length, 3);
  TestValidator.equals(
    "correct keys",
    keys.sort(),
    ["links", "status", "version"].sort(),
  );
}
