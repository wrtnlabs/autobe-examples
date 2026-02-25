import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_section_deletion_denied_to_citizen(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicBoardAdministrator.IJoin;
  await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  // Create citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenPassword = RandomGenerator.alphaNumeric(16);
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: citizenEmail,
      password: citizenPassword,
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // Login as citizen (unprivileged user)
  await authorize_citizen_login(citizenConnection, {
    body: {
      email: citizenEmail,
      password: citizenPassword,
    } satisfies IEconomicBoardCitizen.ILogin,
  });
  // Attempt to delete a non-existent section as citizen (should fail with 403)
  // Per API contract: deleting a section requires admin privilege, regardless of section existence
  const fakeSectionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "citizen cannot delete section (403 Forbidden)",
    403,
    async () => {
      await api.functional.economicBoard.administrator.sections.erase(
        citizenConnection,
        {
          sectionId: fakeSectionId,
        },
      );
    },
  );
}
