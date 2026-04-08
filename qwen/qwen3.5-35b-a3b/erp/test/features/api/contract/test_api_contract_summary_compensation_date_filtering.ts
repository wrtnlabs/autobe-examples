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

export async function test_api_contract_summary_compensation_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member user
  const userConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(auth);
  userConnection.headers = { Authorization: `Bearer ${auth.token.access}` };
  const now = new Date();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  // 2. Test compensationMin filter - high pay contracts (>= 50000)
  const recentStartDate = new Date(now.getTime() - oneYearMs).toISOString();
  const minFilterResponse =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      userConnection,
      {
        body: {
          startDate: recentStartDate,
          compensationMin: 50000,
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(minFilterResponse);
  // Validate compensationMin filter - all returned contracts should have compensation >= 50000 or null
  minFilterResponse.data.forEach((contract) => {
    if (
      contract.compensation_amount !== null &&
      contract.compensation_amount !== undefined
    ) {
      TestValidator.predicate(
        "each contract meets min compensation",
        contract.compensation_amount >= 50000,
      );
    }
  });
  // 3. Test compensationMax filter - low pay contracts (<= 20000)
  const maxFilterResponse =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      userConnection,
      {
        body: {
          compensationMax: 20000,
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(maxFilterResponse);
  // Validate compensationMax filter - all returned contracts should have compensation <= 20000 or null
  maxFilterResponse.data.forEach((contract) => {
    if (
      contract.compensation_amount !== null &&
      contract.compensation_amount !== undefined
    ) {
      TestValidator.predicate(
        "each contract meets max compensation",
        contract.compensation_amount <= 20000,
      );
    }
  });
  // 4. Test combined compensation range filter (20000-50000)
  const rangeFilterResponse =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      userConnection,
      {
        body: {
          compensationMin: 20000,
          compensationMax: 50000,
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(rangeFilterResponse);
  // Validate compensation range filter
  rangeFilterResponse.data.forEach((contract) => {
    if (
      contract.compensation_amount !== null &&
      contract.compensation_amount !== undefined
    ) {
      TestValidator.predicate(
        "contract in compensation range",
        contract.compensation_amount >= 20000 &&
          contract.compensation_amount <= 50000,
      );
    }
  });
  // 5. Test startDate filter
  const startDateFilterResponse =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      userConnection,
      {
        body: {
          startDate: recentStartDate,
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(startDateFilterResponse);
  startDateFilterResponse.data.forEach((contract) => {
    const startDate = new Date(contract.start_date);
    const filterDate = new Date(recentStartDate);
    TestValidator.predicate(
      "contract start date after filter",
      startDate >= filterDate,
    );
  });
  // 6. Test endDate filter
  const pastEndDate = new Date(now.getTime() - oneYearMs).toISOString();
  const endDateFilterResponse =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      userConnection,
      {
        body: {
          endDate: pastEndDate,
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(endDateFilterResponse);
  endDateFilterResponse.data.forEach((contract) => {
    if (contract.end_date !== null && contract.end_date !== undefined) {
      const endDate = new Date(contract.end_date);
      const filterDate = new Date(pastEndDate);
      TestValidator.predicate(
        "contract end date before filter",
        endDate <= filterDate,
      );
    }
  });
  // 7. Test combined compensation + date filter
  const combinedFilterResponse =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      userConnection,
      {
        body: {
          startDate: recentStartDate,
          compensationMin: 20000,
          compensationMax: 50000,
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  combinedFilterResponse.data.forEach((contract) => {
    if (
      contract.compensation_amount !== null &&
      contract.compensation_amount !== undefined
    ) {
      TestValidator.predicate(
        "contract in compensation range",
        contract.compensation_amount >= 20000 &&
          contract.compensation_amount <= 50000,
      );
    }
    const startDate = new Date(contract.start_date);
    const filterDate = new Date(recentStartDate);
    TestValidator.predicate(
      "contract start date in range",
      startDate >= filterDate,
    );
  });
  // 8. Test sorting by start_date descending
  const sortResponse =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      userConnection,
      {
        body: {
          sortBy: "start_date",
          sortOrder: "desc",
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(sortResponse);
  for (let i = 1; i < sortResponse.data.length; i++) {
    const prev = new Date(sortResponse.data[i - 1].start_date);
    const curr = new Date(sortResponse.data[i].start_date);
    TestValidator.predicate(
      "contracts sorted by start_date desc",
      prev >= curr,
    );
  }
  // 9. Test sorting by start_date ascending
  const sortAscResponse =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      userConnection,
      {
        body: {
          sortBy: "start_date",
          sortOrder: "asc",
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(sortAscResponse);
  for (let i = 1; i < sortAscResponse.data.length; i++) {
    const prev = new Date(sortAscResponse.data[i - 1].start_date);
    const curr = new Date(sortAscResponse.data[i].start_date);
    TestValidator.predicate("contracts sorted by start_date asc", prev <= curr);
  }
  // 10. Test pagination
  const paginationResponse =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 5,
          compensationMin: 0,
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination limit respected",
    paginationResponse.data.length,
    Math.min(5, paginationResponse.pagination.records),
  );
  TestValidator.equals(
    "pagination current page",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records positive or zero",
    paginationResponse.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages correct",
    paginationResponse.pagination.pages,
    Math.ceil(
      paginationResponse.pagination.records /
        paginationResponse.pagination.limit,
    ),
  );
  // 11. Test status filter - active contracts
  const statusFilterResponse =
    await api.functional.hrmPlatform.member.contracts.summary.index(
      userConnection,
      {
        body: {
          status: "active",
        } satisfies IHrmPlatformContract.IRequest,
      },
    );
  typia.assert(statusFilterResponse);
  statusFilterResponse.data.forEach((contract) => {
    TestValidator.equals("contract status active", contract.status, "active");
  });
  // 12. Test response includes all required fields for each contract
  if (paginationResponse.data.length > 0) {
    for (const contract of paginationResponse.data) {
      typia.assert(contract);
      TestValidator.predicate(
        "contract has valid id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          contract.id,
        ),
      );
      TestValidator.predicate("contract has title", contract.title.length > 0);
      TestValidator.predicate(
        "contract has start date",
        contract.start_date !== null && contract.start_date !== undefined,
      );
      TestValidator.equals(
        "contract status is string",
        typeof contract.status,
        "string",
      );
      TestValidator.equals(
        "contract employee is object",
        typeof contract.employee,
        "object",
      );
      TestValidator.equals(
        "contract employee has id",
        contract.employee.id !== null && contract.employee.id !== undefined,
        true,
      );
    }
  }
}
