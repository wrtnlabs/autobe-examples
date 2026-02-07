import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_profile_stats_mixed_active_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a citizen account (prerequisite)
  const citizenConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 2 });
  await authorize_citizen_join(citizenConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      bio,
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // 2. Retrieve profile stats
  const profileStats =
    await api.functional.economicBoard.citizen.profile.stats.index(
      citizenConnection,
    );
  typia.assert(profileStats);
}
