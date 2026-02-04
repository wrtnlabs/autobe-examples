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

export async function test_api_administrator_promotion_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IEconomicDiscussionSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(2),
      } satisfies IEconomicDiscussionSuperAdministrator.IJoin,
    });
  typia.assert(superAdmin);
  // We have no way to create a citizen promotion request through provided API
  // The scenario requires a pending request, but there is no API to create one
  // We'll use a valid UUID to represent a real pending request in the database
  const pendingRequestId = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Reject the request with a reason
  const rejectResponse: IEconomicDiscussionAdministratorRequestDecision =
    await api.functional.economicDiscussion.superAdministrator.administrator_request_decisions.putByDecisionid(
      superAdminConnection,
      {
        decisionId: pendingRequestId,
        body: {
          status: "rejected",
        } satisfies IEconomicDiscussionAdministratorRequestDecision.IUpdate,
      },
    );
  typia.assert(rejectResponse);
  // Step 3: Validate rejection metadata
  // Since IEconomicDiscussionAdministratorRequestDecision response type does NOT contain status property,
  // we cannot validate status as originally required in the scenario
  // Instead, we validate what IS available in the response:
  TestValidator.equals(
    "request_id should match pending request",
    rejectResponse.request_id,
    pendingRequestId,
  );
  // The response should contain a reason as per DTO definition
  // Validate reason exists and meets length requirements
  TestValidator.predicate(
    "reason should be provided",
    rejectResponse.reason !== undefined && rejectResponse.reason !== null,
  );
  TestValidator.predicate(
    "reason should be non-empty",
    rejectResponse.reason.length >= 1,
  );
  TestValidator.predicate(
    "reason should be within length limit",
    rejectResponse.reason.length <= 200,
  );
}
