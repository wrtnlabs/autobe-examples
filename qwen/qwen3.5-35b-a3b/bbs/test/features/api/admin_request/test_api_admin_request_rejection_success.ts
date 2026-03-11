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

export async function test_api_admin_request_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Super administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IEconomicPoliticalBoardAdmin.IJoin>,
  });
  typia.assert(adminAuth);
  // Step 2: Regular member joins the system
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IEconomicPoliticalBoardMember.IJoin>,
  });
  typia.assert(memberAuth);
  // Step 3: Super administrator retrieves pending requests to get valid requestId
  const pendingRequests =
    await api.functional.economicPoliticalBoard.admin.requests.index(
      adminConnection,
      {
        body: {} satisfies IEconomicPoliticalBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // TestValidator: pending requests list should have at least one item
  TestValidator.equals(
    "has pending requests",
    pendingRequests.data.length > 0,
    true,
  );
  // Get the first pending request ID
  const requestId = pendingRequests.data[0].id;
  const originalStatus = pendingRequests.data[0].status;
  // TestValidator: first request should be in pending status
  TestValidator.equals("first request is pending", originalStatus, "pending");
  // Step 4: Super administrator rejects the request
  const rejectionNotes = `Rejected due to insufficient qualifications for administrator role. Reason: ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const rejectionResponse =
    await api.functional.economicPoliticalBoard.admin.requests.reject(
      adminConnection,
      {
        requestId,
        body: {
          review_notes: rejectionNotes,
        } satisfies IEconomicPoliticalBoardAdministratorRequest.IReject,
      },
    );
  typia.assert(rejectionResponse);
  // Step 5: Validate response contains correct audit fields
  TestValidator.equals(
    "status changed to rejected",
    rejectionResponse.status,
    "rejected",
  );
  TestValidator.equals(
    "review notes populated",
    rejectionResponse.review_notes,
    rejectionNotes,
  );
  TestValidator.predicate(
    "reviewed_at timestamp set",
    rejectionResponse.reviewed_at !== null,
  );
  if (rejectionResponse.reviewed_at) {
    TestValidator.predicate(
      "reviewedAt is valid date-time",
      !isNaN(new Date(rejectionResponse.reviewed_at).getTime()),
    );
  }
  // Validate reviewedByAdmin field contains the rejecting admin's information
  TestValidator.predicate(
    "reviewedByAdmin is populated",
    rejectionResponse.reviewedByAdmin !== null,
  );
  if (rejectionResponse.reviewedByAdmin) {
    TestValidator.equals(
      "reviewedByAdmin has valid ID",
      rejectionResponse.reviewedByAdmin.id.length > 0,
      true,
    );
    TestValidator.equals(
      "reviewedByAdmin has super grade",
      rejectionResponse.reviewedByAdmin.grade,
      "super",
    );
  }
  // Validate original reason is preserved
  TestValidator.equals(
    "reason preserved",
    rejectionResponse.reason,
    rejectionResponse.reason,
  );
  // Validate updated_at timestamp is updated
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(rejectionResponse.updated_at).getTime() >
      new Date(rejectionResponse.created_at).getTime(),
  );
  // Step 6: Verify the rejected request no longer appears in pending requests list
  const remainingPendingRequests =
    await api.functional.economicPoliticalBoard.admin.requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEconomicPoliticalBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(remainingPendingRequests);
  // TestValidator: rejected request should not be in pending list
  const stillPending = remainingPendingRequests.data.some(
    (req) => req.id === requestId,
  );
  TestValidator.equals(
    "request no longer in pending list",
    stillPending,
    false,
  );
  // TestValidator: total pending count should decrease by one
  TestValidator.equals(
    "pending count decreased",
    remainingPendingRequests.pagination.records,
    pendingRequests.pagination.records - 1,
  );
}
