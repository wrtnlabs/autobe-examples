import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
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

export async function test_api_admin_request_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResult = await authorize_admin_join(
    superAdminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEconomicPoliticalBoardAdmin.IJoin,
    },
  );
  typia.assert(superAdminJoinResult);
  // Create admin connection with token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: superAdminJoinResult.token.access,
    },
  };
  // 2. Register member
  const memberJoinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  // Note: Admin request submission would require additional endpoint.
  // For this test, we assume pending requests exist in the system.
  // 3. Retrieve pending requests as super admin
  const pendingRequests =
    await api.functional.economicPoliticalBoard.admin.requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEconomicPoliticalBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    pendingRequests.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pendingRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pendingRequests.pagination.pages >= 0,
  );
  // 5. Validate data structure
  typia.assert(pendingRequests.data!);
  TestValidator.predicate(
    "pending requests data is array",
    Array.isArray(pendingRequests.data),
  );
  // 6. Validate each request has required fields and pending status
  for (const request of pendingRequests.data) {
    typia.assert(request!);
    TestValidator.predicate(
      "request has valid id (UUID format)",
      /^[0-9a-f-]{36}$/i.test(request.id),
    );
    TestValidator.predicate("request has reason", request.reason.length > 0);
    TestValidator.equals(
      "request status is pending",
      request.status,
      "pending",
    );
    TestValidator.predicate(
      "request has valid created_at",
      request.created_at.length > 0,
    );
    TestValidator.predicate(
      "request has valid user_id (UUID format)",
      /^[0-9a-f-]{36}$/i.test(request.user_id),
    );
  }
  // 7. Verify no non-pending requests in results
  const hasNonPendingStatus = pendingRequests.data.some(
    (req) => req.status !== "pending",
  );
  TestValidator.equals(
    "only pending requests returned",
    hasNonPendingStatus,
    false,
  );
}
