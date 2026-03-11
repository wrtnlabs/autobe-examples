import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
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

export async function test_api_admin_request_approval_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<IEconomicPoliticalBoardAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // Ensure admin connection has authorization header set
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // Get admin's user ID for later validation
  const adminId: string = adminAuth.id;
  // 2. Create a regular member who will request admin privileges
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_admin_join(memberConnection, {
    body: typia.random<IEconomicPoliticalBoardAdmin.IJoin>(),
  });
  typia.assert(memberAuth);
  // Ensure member connection has authorization header set
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  // Get member's user ID for later validation
  const memberId: string = memberAuth.id;
  // 3. Member submits an administrator request
  const requestBody = typia.assert<IEconomicPoliticalBoardAdministratorRequest.IRequest>(
    typia.random<IEconomicPoliticalBoardAdministratorRequest.IRequest>(),
  );
  await api.functional.economicPoliticalBoard.admin.requests.index(
    memberConnection,
    {
      body: requestBody,
    },
  );
  // 4. Super administrator retrieves pending administrator requests
  const pendingRequests =
    await api.functional.economicPoliticalBoard.admin.requests.index(
      adminConnection,
      {
        body: {
          sortBy: "created_at" as const,
          sortOrder: "desc" as const,
        },
      },
    );
  typia.assert(pendingRequests);
  // 5. Approve the first pending request
  if (pendingRequests.data.length === 0) {
    throw new Error("No pending administrator requests found");
  }
  const requestId: string = pendingRequests.data[0].id;
  const reviewNotes = "Strong justification for administrative privileges";
  const approvalResult =
    await api.functional.economicPoliticalBoard.admin.requests.approve(
      adminConnection,
      {
        requestId,
        body: {
          review_notes: reviewNotes,
        },
      },
    );
  typia.assert(approvalResult);
  // 6. Validate the approval result
  TestValidator.equals(
    "request status is approved",
    approvalResult.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is not null",
    () => approvalResult.reviewed_at !== null,
  );
  TestValidator.equals(
    "review_notes are set",
    approvalResult.review_notes,
    reviewNotes,
  );
  // Verify reviewed_by_admin_id matches the super admin's ID
  if (approvalResult.reviewedByAdmin !== null) {
    TestValidator.equals(
      "reviewed_by matches admin ID",
      approvalResult.reviewedByAdmin.id,
      adminId,
    );
  }
  // Verify the user object shows the requesting member's ID
  TestValidator.equals(
    "user is the requesting member",
    approvalResult.user.id,
    memberId,
  );
  // 7. Verify timestamp is recent (within last minute)
  if (approvalResult.reviewed_at !== null) {
    const now = new Date();
    const approvedAt = new Date(approvalResult.reviewed_at);
    const diffInMinutes = (now.getTime() - approvedAt.getTime()) / (1000 * 60);
    TestValidator.predicate("reviewed_at is recent", diffInMinutes <= 1);
  }
}