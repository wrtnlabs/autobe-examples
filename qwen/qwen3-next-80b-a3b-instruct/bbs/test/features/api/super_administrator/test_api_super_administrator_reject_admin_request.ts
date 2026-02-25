import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministrator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_reject_admin_request(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super administrator for rejection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicBoardSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Step 2: Create a citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizen = await authorize_super_administrator_join(citizenConnection, {
    body: {
      email: citizenEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardSuperAdministrator.IJoin,
  });
  typia.assert(citizen);
  // Step 3: Submit a promotion request as the citizen user
  // According to API specification, the create endpoint requires IEconomicBoardAdministratorAuditLog as body
  const requestConnection: api.IConnection = { host: connection.host };
  requestConnection.headers = {
    Authorization: `Bearer ${citizen.token.access}`,
  };
  const requestReason = RandomGenerator.paragraph({ sentences: 2 });
  // Create a proper IEconomicBoardAdministratorAuditLog object
  const auditLog: IEconomicBoardAdministratorAuditLog = {
    id: typia.random<string & tags.Format<"uuid">>(),
    actor_id: citizen.id,
    target_id: citizen.id,
    action_type: "approve_admin_request",
    reason: requestReason,
    ip_address: "127.0.0.1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actor: {
      id: citizen.id,
      email: citizenEmail,
      display_name: citizenEmail.split("@")[0],
      bio: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
  await api.functional.economicBoard.superAdministrator.requests.create(
    requestConnection,
    {
      body: auditLog,
    },
  );
  // Step 4: Super administrator rejects the pending request
  const rejectConnection: api.IConnection = { host: connection.host };
  rejectConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  const rejectedAdmin =
    await api.functional.economicBoard.superAdministrator.requests.reject(
      rejectConnection,
      {
        requestId: citizen.id,
      },
    );
  typia.assert(rejectedAdmin);
  // Step 5: Validate the rejection result
  TestValidator.equals(
    "request status is rejected",
    rejectedAdmin.admin_request_status,
    "rejected",
  );
  TestValidator.equals(
    "request reason preserved",
    rejectedAdmin.admin_request_reason,
    requestReason,
  );
  TestValidator.equals(
    "rejected administrator ID matches citizen ID",
    rejectedAdmin.id,
    citizen.id,
  );
  // Validate email format using TestValidator.equals with a boolean predicate
  TestValidator.equals(
    "email format is valid",
    /^\S+@\S+\.\S+$/.test(rejectedAdmin.email),
    true,
  );
}
