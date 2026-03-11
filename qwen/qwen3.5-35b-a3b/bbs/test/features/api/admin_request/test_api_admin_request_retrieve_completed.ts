import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_retrieve_completed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a completed admin request with approved status
  const completedRequest = {
    id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: "approved" as const,
    reviewed_at: new Date().toISOString(),
    review_notes: "Approved - candidate meets all requirements",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: typia.random<string & tags.Format<"uuid">>(),
      grade: "regular" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as IEconomicPoliticalBoardAdministratorRole.ISummary,
    reviewedByAdmin: {
      id: adminAuth.id,
      grade: "super" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as IEconomicPoliticalBoardAdministratorRole.ISummary,
  } satisfies IEconomicPoliticalBoardAdministratorRequest;
  const requestId = completedRequest.id;
  typia.assert(completedRequest);
  // 3. Call GET endpoint
  const retrievedRequest =
    await api.functional.economicPoliticalBoard.admin.requests.at(
      adminConnection,
      {
        requestId,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validate response
  TestValidator.equals("request ID matches", retrievedRequest.id, requestId);
  TestValidator.equals(
    "request status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "review notes present",
    retrievedRequest.review_notes,
    completedRequest.review_notes,
  );
  TestValidator.predicate(
    "reviewed at is present",
    retrievedRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewed by admin is present",
    retrievedRequest.reviewedByAdmin !== null,
  );
  TestValidator.equals(
    "request user matches",
    retrievedRequest.user.id,
    completedRequest.user.id,
  );
  TestValidator.equals(
    "request reason matches",
    retrievedRequest.reason,
    completedRequest.reason,
  );
}
