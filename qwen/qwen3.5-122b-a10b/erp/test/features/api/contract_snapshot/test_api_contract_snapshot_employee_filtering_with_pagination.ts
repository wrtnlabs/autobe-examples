import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractSnapshot";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContractSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_contract_snapshot_employee_filtering_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account for authentication
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create authenticated member connection
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${memberAuth.token.access}` },
  };
  // 3. First request - get contract snapshots with employee filter
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const firstPage =
    await api.functional.hrmPlatform.member.contractSnapshots.index(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          limit: 10,
          page: 1,
        } satisfies IHrmPlatformContractSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  // 5. Validate snapshot data structure if data exists
  if (firstPage.data.length > 0) {
    const firstSnapshot = firstPage.data[0]!;
    typia.assert(firstSnapshot);
    TestValidator.predicate("snapshot has id", firstSnapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot has start_date",
      firstSnapshot.start_date.length > 0,
    );
    TestValidator.predicate(
      "snapshot has pay_rate",
      firstSnapshot.pay_rate >= 0,
    );
    TestValidator.predicate(
      "snapshot has pay_period",
      firstSnapshot.pay_period.length > 0,
    );
    TestValidator.predicate(
      "snapshot has working_hours",
      firstSnapshot.working_hours_per_week > 0,
    );
  }
  // 6. Test cursor-based pagination with cursor from response
  // Only test cursor pagination if there's a cursor available in the response
  // For cursor-based pagination, we would use the cursor from the previous response
  // Since we're filtering by random employee_id, we test the cursor parameter acceptance
  const cursorTestPage =
    await api.functional.hrmPlatform.member.contractSnapshots.index(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          limit: 10,
          cursor: undefined, // Test with undefined cursor (first page)
        } satisfies IHrmPlatformContractSnapshot.IRequest,
      },
    );
  typia.assert(cursorTestPage);
  // 7. Validate cursor pagination response
  TestValidator.equals(
    "cursor page current",
    cursorTestPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "cursor page limit valid",
    cursorTestPage.pagination.limit > 0,
  );
}
