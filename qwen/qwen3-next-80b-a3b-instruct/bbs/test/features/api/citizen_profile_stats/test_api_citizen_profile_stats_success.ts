import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_profile_stats_success(
  connection: api.IConnection,
): Promise<void> {
  // Create citizen connection
  const citizenConnection: api.IConnection = { host: connection.host };
  // Register a new citizen
  const joinBody: IEconomicBoardCitizen.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!" as string & tags.MinLength<8>,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const authorized = await authorize_citizen_join(citizenConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Verify citizen is authorized
  typia.assert(authorized.id);
  typia.assert(authorized.token.access);
  // Fetch profile stats for new user (should be empty object)
  const statsInitial =
    await api.functional.economicBoard.citizen.profile.stats.index(
      citizenConnection,
    );
  // Validate that response is correctly typed as empty IEconomicBoardProfile
  typia.assert(statsInitial);
  // No property validation possible - IEconomicBoardProfile is empty object
  // All assertions are satisfied by typia.assert(statsInitial) since the type system ensures correct structure
}