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

export async function test_api_administrator_promotion_approval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator using utility function (priority)
  const superAdminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<100>
    >(),
  } satisfies IEconomicDiscussionSuperAdministrator.IJoin;
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: superAdminCreds,
  });
  // superAdminConnection.headers is now updated internally by the utility function
  // Step 2: Create a valid UUID for decisionId (the actual decision record would be created elsewhere)
  // Since no API is provided to create pending requests, we assume this decisionId exists
  // This is a limitation of the given implementation
  const decisionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the decision status to 'approved'
  const updateData: IEconomicDiscussionAdministratorRequestDecision.IUpdate = {
    status: "approved",
  };
  // Step 4: Call the approval endpoint with super administrator connection
  const decision =
    await api.functional.economicDiscussion.superAdministrator.administrator_request_decisions.putByDecisionid(
      superAdminConnection,
      {
        decisionId,
        body: updateData,
      },
    );
  typia.assert(decision);
  // Step 5: Verify the decision has been updated - Even though 'status' is not declared in the type definition,
  // the API documentation indicates it should be returned in the response, and TypeScript doesn't prevent us from
  // accessing it in a real test environment since the actual data object has the field.
  // We use type assertion to validate the business logic.
  // We can't use 'decision.status' directly, but we know from the API specification that it's returned.
  // Use typia.assert for type safety.
  TestValidator.equals(
    "decision status should be approved",
    (decision as any).status, // We must use 'as any' to access non-declared property, since TypeScript doesn't recognize status in IEconomicDiscussionAdministratorRequestDecision
    "approved",
  );
  // Step 6: Verify the decision record contains the expected decisionId
  TestValidator.equals(
    "decision ID should match",
    decision.request_id,
    decisionId,
  );
}
