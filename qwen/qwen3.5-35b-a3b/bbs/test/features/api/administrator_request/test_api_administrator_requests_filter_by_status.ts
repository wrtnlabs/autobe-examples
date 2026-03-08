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

export async function test_api_administrator_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and login as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Update admin connection with token
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 2. Get all administrator requests (no filter)
  const allFilterBody =
    {} satisfies IEconomicPoliticalBoardAdministratorRequest.IRequest;
  const allResult =
    await api.functional.economicPoliticalBoard.admin.administrator_requests.index(
      adminAuthConnection,
      { body: allFilterBody },
    );
  typia.assert(allResult);
  // 3. Test filtering by 'pending' status
  const pendingFilterBody = {
    status: "pending" as const,
  } satisfies IEconomicPoliticalBoardAdministratorRequest.IRequest;
  const pendingResult =
    await api.functional.economicPoliticalBoard.admin.administrator_requests.index(
      adminAuthConnection,
      { body: pendingFilterBody },
    );
  typia.assert(pendingResult);
  // Validate all pending requests have status 'pending'
  TestValidator.equals(
    "pending filter returns only pending requests",
    pendingResult.data.every((req) => req.status === "pending"),
    true,
  );
  // Validate pagination metadata matches actual count
  TestValidator.equals(
    "pending pagination records matches data length",
    pendingResult.pagination.records,
    pendingResult.data.length,
  );
  // 4. Test filtering by 'approved' status
  const approvedFilterBody = {
    status: "approved" as const,
  } satisfies IEconomicPoliticalBoardAdministratorRequest.IRequest;
  const approvedResult =
    await api.functional.economicPoliticalBoard.admin.administrator_requests.index(
      adminAuthConnection,
      { body: approvedFilterBody },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "approved filter returns only approved requests",
    approvedResult.data.every((req) => req.status === "approved"),
    true,
  );
  TestValidator.equals(
    "approved pagination records matches data length",
    approvedResult.pagination.records,
    approvedResult.data.length,
  );
  // 5. Test filtering by 'rejected' status
  const rejectedFilterBody = {
    status: "rejected" as const,
  } satisfies IEconomicPoliticalBoardAdministratorRequest.IRequest;
  const rejectedResult =
    await api.functional.economicPoliticalBoard.admin.administrator_requests.index(
      adminAuthConnection,
      { body: rejectedFilterBody },
    );
  typia.assert(rejectedResult);
  TestValidator.equals(
    "rejected filter returns only rejected requests",
    rejectedResult.data.every((req) => req.status === "rejected"),
    true,
  );
  TestValidator.equals(
    "rejected pagination records matches data length",
    rejectedResult.pagination.records,
    rejectedResult.data.length,
  );
  // 6. Verify that all requests in unfiltered result match the sum of filtered results
  const pendingCount = pendingResult.data.length;
  const approvedCount = approvedResult.data.length;
  const rejectedCount = rejectedResult.data.length;
  const totalCount = pendingCount + approvedCount + rejectedCount;
  TestValidator.equals(
    "all filter count matches sum of filtered counts",
    allResult.data.length,
    totalCount,
  );
  TestValidator.equals(
    "all pagination records matches sum of filtered records",
    allResult.pagination.records,
    totalCount,
  );
  // 7. Verify all requests in each filter have correct author structure
  pendingResult.data.forEach((req) => {
    typia.assert(req.author);
    TestValidator.equals(
      "pending request has author id",
      req.author.userId !== undefined,
      true,
    );
  });
  approvedResult.data.forEach((req) => {
    typia.assert(req.author);
    TestValidator.equals(
      "approved request has author id",
      req.author.userId !== undefined,
      true,
    );
  });
  rejectedResult.data.forEach((req) => {
    typia.assert(req.author);
    TestValidator.equals(
      "rejected request has author id",
      req.author.userId !== undefined,
      true,
    );
  });
}