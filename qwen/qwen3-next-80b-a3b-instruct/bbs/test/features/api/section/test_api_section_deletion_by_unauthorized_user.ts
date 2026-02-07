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

export async function test_api_section_deletion_by_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_administrator_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(adminJoinResponse);
  // 2. Authenticate as administrator
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminJoinResponse.token.access.split(".")[1], // Extract email from JWT token (simplified) - this is a fallback since no other way to get email
    },
  });
  // 3. Create citizen account
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenJoinResponse = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(citizenJoinResponse);
  // 4. Authenticate as citizen
  const citizenLoginConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_login(citizenLoginConnection, {
    body: {},
  });
  // 5. Generate a valid UUID section ID that may exist in system
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Attempt to delete section using unauthorized citizen connection
  const deleteAttempt = async () => {
    await api.functional.economicBoard.administrator.sections.erase(
      citizenLoginConnection,
      {
        sectionId,
      },
    );
  };
  // 7. Verify deletion fails with 403 Forbidden - authorized users can delete, unauthorized users get 403
  await TestValidator.httpError(
    "unauthorized section deletion should return 403",
    403,
    deleteAttempt,
  );
  // Note: We cannot verify section remains unaffected because no section retrieval API is available
  // The server's security behavior is validated by the 403 response when unauthorized user attempts deletion.
}
