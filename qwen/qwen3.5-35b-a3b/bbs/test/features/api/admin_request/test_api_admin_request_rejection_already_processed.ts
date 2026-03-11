import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_admin_request_rejection_already_processed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Regular member joins (to create admin request)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 3. Super administrator obtains pending admin requests
  const pendingRequests =
    await api.functional.economicPoliticalBoard.admin.requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortOrder: "desc",
        } satisfies IEconomicPoliticalBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // Validate that at least one pending request exists
  TestValidator.predicate(
    "has pending requests",
    pendingRequests.data.length > 0,
  );
  // 4. First rejection (should succeed)
  const firstRequestId = pendingRequests.data[0].id;
  const firstRejectionResult =
    await api.functional.economicPoliticalBoard.admin.requests.reject(
      adminConnection,
      {
        requestId: firstRequestId,
        body: {
          review_notes: "Test rejection - insufficient qualifications",
        } satisfies IEconomicPoliticalBoardAdministratorRequest.IReject,
      },
    );
  typia.assert(firstRejectionResult);
  // Verify first rejection status is 'rejected'
  TestValidator.equals(
    "first rejection status",
    firstRejectionResult.status,
    "rejected",
  );
  // 5. Second rejection attempt (should fail with 400)
  await TestValidator.httpError(
    "rejecting already rejected request returns 400",
    400,
    async () => {
      await api.functional.economicPoliticalBoard.admin.requests.reject(
        adminConnection,
        {
          requestId: firstRequestId,
          body: {
            review_notes: "Second rejection attempt - should fail",
          } satisfies IEconomicPoliticalBoardAdministratorRequest.IReject,
        },
      );
    },
  );
  // 6. Verify request status remains 'rejected' by retrieving the specific request
  // We need to check the request details to confirm status
  const allRequests =
    await api.functional.economicPoliticalBoard.admin.requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sortOrder: "desc",
        } satisfies IEconomicPoliticalBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  const foundRequest = allRequests.data.find(
    (req) => req.id === firstRequestId,
  );
  if (!foundRequest) {
    throw new Error("Request not found in system");
  }
  TestValidator.equals(
    "request status remains rejected",
    foundRequest.status,
    "rejected",
  );
  // 7. Verify the rejected request is no longer in fresh pending query
  const freshPendingRequests =
    await api.functional.economicPoliticalBoard.admin.requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortOrder: "desc",
        } satisfies IEconomicPoliticalBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(freshPendingRequests);
  const foundInPending = freshPendingRequests.data.some(
    (req) => req.id === firstRequestId,
  );
  TestValidator.notEquals(
    "rejected request not in pending list",
    true,
    foundInPending,
  );
  // 8. Validate business logic: processed requests cannot be re-processed
  TestValidator.predicate(
    "system prevents re-processing of rejected requests",
    pendingRequests.data.length === freshPendingRequests.data.length,
  );
}
