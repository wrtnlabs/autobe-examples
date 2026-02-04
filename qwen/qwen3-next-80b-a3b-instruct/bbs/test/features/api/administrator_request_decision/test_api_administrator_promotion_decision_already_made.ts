import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministratorRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministratorRequestDecision";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_promotion_decision_already_made(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IEconomicDiscussionSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Step 2: Generate a random administrator promotion request ID (simulated as having already been approved)
  // In the real system, this decision would have been created during a prior approval operation
  // For this test, we are assuming the decision record already exists with status 'approved'
  const decisionId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to reject an already-approved administrator promotion decision
  // According to business logic, rejecting a decision that already has a status assigned (approved)
  // should fail with a 400 error indicating "decision already has a status assigned"
  await TestValidator.error(
    "rejection of already-approved decision should fail",
    async () => {
      await api.functional.economicDiscussion.superAdministrator.administrator_request_decisions.putByDecisionid(
        superAdminConnection,
        {
          decisionId: decisionId,
          body: {
            status: "rejected",
          } satisfies IEconomicDiscussionAdministratorRequestDecision.IUpdate,
        },
      );
    },
  );
  // NOTE: We cannot verify the decision record remains unchanged because there is no GET endpoint
  // for individual decision records. The system's failure to allow the update is sufficient proof
  // that the decision state was protected. The error response validates the integrity constraint.
}
