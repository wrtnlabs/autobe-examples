import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that regular administrators cannot approve administrator requests.
 *
 * Validates that only super administrators have access to approve admin role escalation
 * requests. Regular administrators attempting to approve any pending request will receive
 * a 403 Forbidden error with clear messaging about insufficient privileges.
 */
export async function test_api_administrator_request_approval_regular_admin_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.assert<string & tags.Format<"uri"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string & tags.Format<"uri">>()),
      referrer: typia.assert<string & tags.Format<"uri"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string & tags.Format<"uri">>()),
    },
  });
  typia.assert(adminJoin);
  // 2. Authenticate as regular admin with new connection
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(regularAdminConnection, {
    body: {
      email: adminJoin.token.access,
      password: adminJoin.token.access,
    },
  });
  // 3. Test approval attempt with valid UUID format
  // Using a generated UUID to ensure valid format (even though request doesn't exist)
  const testRequestId: string & tags.Format<"uuid"> = typia.assert<string & tags.Format<"uuid">>(typia.random<string & tags.Format<"uuid">>());
  // 4. Verify regular admin receives 403 when attempting to approve
  await TestValidator.httpError(
    "regular admin cannot approve admin requests",
    403,
    async () => {
      await api.functional.economicPoliticalBoard.admin.pending_requests.approve(
        regularAdminConnection,
        { requestId: testRequestId },
      );
    },
  );
}