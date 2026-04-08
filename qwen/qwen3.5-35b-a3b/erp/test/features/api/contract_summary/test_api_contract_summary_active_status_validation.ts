import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_contract_summary_active_status_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member for authentication
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection for API calls
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 3. Test 1: Retrieve all contracts (no filter)
  const allContracts =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(allContracts);
  // 4. Test 2: Retrieve only active contracts
  const activeContracts =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "active",
        },
      },
    );
  typia.assert(activeContracts);
  // 5. Test 3: Retrieve only ended contracts
  const endedContracts =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "ended",
        },
      },
    );
  typia.assert(endedContracts);
  // 6. Validate status filtering results
  // Check that active contracts only contain 'active' status
  for (const contract of activeContracts.data) {
    TestValidator.equals("active contract status", contract.status, "active");
  }
  // Check that ended contracts only contain 'ended' status
  for (const contract of endedContracts.data) {
    TestValidator.equals("ended contract status", contract.status, "ended");
  }
  // 7. Validate pagination metadata
  TestValidator.equals(
    "all contracts pagination current",
    allContracts.pagination.current,
    1,
  );
  TestValidator.equals(
    "all contracts pagination limit",
    allContracts.pagination.limit,
    10,
  );
  TestValidator.equals(
    "active contracts pagination current",
    activeContracts.pagination.current,
    1,
  );
  TestValidator.equals(
    "active contracts pagination limit",
    activeContracts.pagination.limit,
    10,
  );
  TestValidator.equals(
    "ended contracts pagination current",
    endedContracts.pagination.current,
    1,
  );
  TestValidator.equals(
    "ended contracts pagination limit",
    endedContracts.pagination.limit,
    10,
  );
  // 8. Validate record counts
  TestValidator.equals(
    "all contracts records",
    allContracts.pagination.records,
    allContracts.data.length,
  );
  TestValidator.equals(
    "active contracts records",
    activeContracts.pagination.records,
    activeContracts.data.length,
  );
  TestValidator.equals(
    "ended contracts records",
    endedContracts.pagination.records,
    endedContracts.data.length,
  );
  // 9. Validate page calculations
  TestValidator.equals(
    "all contracts pages",
    allContracts.pagination.pages,
    allContracts.pagination.records === 0
      ? 0
      : Math.ceil(
          allContracts.pagination.records / allContracts.pagination.limit,
        ),
  );
  // 10. Validate contract summary structure
  if (allContracts.data.length > 0) {
    const sampleContract = allContracts.data[0];
    typia.assert(sampleContract);
    // Validate required fields exist
    TestValidator.predicate("contract has id", sampleContract.id !== undefined);
    TestValidator.predicate(
      "contract has title",
      sampleContract.title !== undefined,
    );
    TestValidator.predicate(
      "contract has start_date",
      sampleContract.start_date !== undefined,
    );
    TestValidator.predicate(
      "contract has status",
      sampleContract.status !== undefined,
    );
    TestValidator.predicate(
      "contract has created_at",
      sampleContract.created_at !== undefined,
    );
    TestValidator.predicate(
      "contract has employee",
      sampleContract.employee !== undefined,
    );
    // Validate optional fields
    TestValidator.predicate(
      "contract end_date can be nullable",
      sampleContract.end_date === null ||
        sampleContract.end_date === undefined ||
        typeof sampleContract.end_date === "string",
    );
    TestValidator.predicate(
      "contract compensation can be nullable",
      sampleContract.compensation_amount === null ||
        sampleContract.compensation_amount === undefined ||
        typeof sampleContract.compensation_amount === "number",
    );
    // Validate employee reference structure
    TestValidator.predicate(
      "employee has id",
      sampleContract.employee.id !== undefined,
    );
    TestValidator.predicate(
      "employee has employee_code",
      sampleContract.employee.employee_code !== undefined,
    );
    TestValidator.predicate(
      "employee has display_name",
      sampleContract.employee.display_name !== undefined,
    );
    TestValidator.predicate(
      "employee has email",
      sampleContract.employee.email !== undefined,
    );
    // Validate date format
    const startDate = new Date(sampleContract.start_date);
    TestValidator.predicate(
      "start_date is valid date",
      !isNaN(startDate.getTime()),
    );
    const createdAt = new Date(sampleContract.created_at);
    TestValidator.predicate(
      "created_at is valid date",
      !isNaN(createdAt.getTime()),
    );
  }
  // 11. Test date range filtering
  const dateRangeContracts =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          startDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days ago
        },
      },
    );
  typia.assert(dateRangeContracts);
  // 12. Validate compensation range filtering
  const compensationContracts =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          compensationMin: 0,
        },
      },
    );
  typia.assert(compensationContracts);
}
