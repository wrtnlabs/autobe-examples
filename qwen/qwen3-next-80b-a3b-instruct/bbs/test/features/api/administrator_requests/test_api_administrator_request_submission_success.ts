import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministrator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_request_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  // Setup: Create citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  // Authenticate as citizen to submit request
  const citizenAuthConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_login(citizenAuthConnection, {
    body: { email: citizen.email, password: citizen.token.access },
  });
  // Generate valid 200-character reason
  const reason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  // Submit administrator request (only reason field required)
  const auditLog: IEconomicBoardAdministratorAuditLog = typia.assert<IEconomicBoardAdministratorAuditLog>({
    reason,
    id: typia.random<string>(),
    actor_id: citizen.id,
    action_type: "request_administrator",
    ip_address: "127.0.0.1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  
  await api.functional.economicBoard.superAdministrator.requests.create(
    citizenAuthConnection,
    {
      body: auditLog,
    },
  );
  // Validation: No response body expected (HTTP 204 No Content) - we trust the 204 status
  // Validation: Confirm citizen was updated (must be visible on later queries)
  // We cannot directly access admin_request_status as it's not exported in DTOs, but we can
  // authenticate again and make sure the request can be submitted again (it should fail if already pending)
  const citizenAuthConnection2: api.IConnection = { host: connection.host };
  await authorize_citizen_login(citizenAuthConnection2, {
    body: { email: citizen.email, password: citizen.token.access },
  });
  // Submitting the same request again should fail with 409 Conflict (already pending)
  await TestValidator.httpError(
    "request should fail if already pending",
    409,
    async () => {
      const auditLog2: IEconomicBoardAdministratorAuditLog = typia.assert<IEconomicBoardAdministratorAuditLog>({
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        id: typia.random<string>(),
        actor_id: citizen.id,
        action_type: "request_administrator",
        ip_address: "127.0.0.1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      await api.functional.economicBoard.superAdministrator.requests.create(
        citizenAuthConnection2,
        {
          body: auditLog2,
        },
      );
    },
  );
}