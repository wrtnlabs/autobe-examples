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

export async function test_api_contract_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Test basic pagination
  const page = await api.functional.hrmPlatform.member.contracts.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.equals(
    "pagination pages calculation",
    page.pagination.pages,
    page.pagination.records > 0
      ? Math.ceil(page.pagination.records / page.pagination.limit)
      : 0,
  );
  // 3. Test sorting - start_date ascending
  const sortedAsc = await api.functional.hrmPlatform.member.contracts.index(
    memberConnection,
    {
      body: {
        sortBy: "start_date",
        sortOrder: "asc",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(sortedAsc);
  // 4. Test sorting - start_date descending
  const sortedDesc = await api.functional.hrmPlatform.member.contracts.index(
    memberConnection,
    {
      body: {
        sortBy: "start_date",
        sortOrder: "desc",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(sortedDesc);
  // 5. Test filtering by status - active
  const activeContracts =
    await api.functional.hrmPlatform.member.contracts.index(memberConnection, {
      body: {
        status: "active",
      } satisfies IHrmPlatformContract.IRequest,
    });
  typia.assert(activeContracts);
  // 6. Test filtering by status - ended
  const endedContracts =
    await api.functional.hrmPlatform.member.contracts.index(memberConnection, {
      body: {
        status: "ended",
      } satisfies IHrmPlatformContract.IRequest,
    });
  typia.assert(endedContracts);
  // 7. Test filtering by date range
  const now = new Date();
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDateRange = lastMonth.toISOString();
  const endDateRange = now.toISOString();
  const dateFiltered = await api.functional.hrmPlatform.member.contracts.index(
    memberConnection,
    {
      body: {
        startDate: startDateRange,
        endDate: endDateRange,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(dateFiltered);
  // 8. Test filtering by compensation range
  const compFiltered = await api.functional.hrmPlatform.member.contracts.index(
    memberConnection,
    {
      body: {
        compensationMin: 50000,
        compensationMax: 200000,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(compFiltered);
  // 9. Test sorting by other fields
  const sortByEndDate = await api.functional.hrmPlatform.member.contracts.index(
    memberConnection,
    {
      body: {
        sortBy: "end_date",
        sortOrder: "desc",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(sortByEndDate);
  const sortByCreatedAt =
    await api.functional.hrmPlatform.member.contracts.index(memberConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
      } satisfies IHrmPlatformContract.IRequest,
    });
  typia.assert(sortByCreatedAt);
  // 10. Test sorting by status and title
  const sortByStatus = await api.functional.hrmPlatform.member.contracts.index(
    memberConnection,
    {
      body: {
        sortBy: "status",
        sortOrder: "asc",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(sortByStatus);
  const sortByTitle = await api.functional.hrmPlatform.member.contracts.index(
    memberConnection,
    {
      body: {
        sortBy: "title",
        sortOrder: "desc",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(sortByTitle);
  // 11. Validate contract structure
  const sampleContract = page.data.length > 0 ? page.data[0] : null;
  if (sampleContract !== null) {
    TestValidator.equals(
      "contract has id",
      sampleContract.id !== undefined,
      true,
    );
    TestValidator.equals(
      "contract has title",
      sampleContract.title.length > 0,
      true,
    );
    TestValidator.equals(
      "contract has start_date",
      sampleContract.start_date.length > 0,
      true,
    );
    TestValidator.equals(
      "contract has valid status",
      ["active", "ended"].includes(sampleContract.status),
      true,
    );
    // Validate employee reference
    TestValidator.equals(
      "employee has id",
      sampleContract.employee.id !== undefined,
      true,
    );
    TestValidator.equals(
      "employee has code",
      sampleContract.employee.employee_code.length > 0,
      true,
    );
    TestValidator.equals(
      "employee has display_name",
      sampleContract.employee.display_name.length > 0,
      true,
    );
    TestValidator.equals(
      "employee has email",
      sampleContract.employee.email.length > 0,
      true,
    );
  }
  // 12. Test pagination metadata accuracy
  TestValidator.equals(
    "pagination total pages calculation",
    page.pagination.pages,
    page.pagination.records > 0
      ? Math.ceil(page.pagination.records / page.pagination.limit)
      : 0,
  );
  // 13. Test that all returned contracts have valid employee references
  if (page.data.length > 0) {
    page.data.forEach((contract) => {
      TestValidator.equals(
        `contract ${contract.id} has employee reference`,
        contract.employee !== null && contract.employee !== undefined,
        true,
      );
      TestValidator.equals(
        `contract ${contract.id} employee has required fields`,
        contract.employee.id !== undefined &&
          contract.employee.employee_code.length > 0 &&
          contract.employee.display_name.length > 0 &&
          contract.employee.email.length > 0,
        true,
      );
    });
  }
  // 14. Test active contract identification (end_date is null or in future)
  if (page.data.length > 0) {
    page.data.forEach((contract) => {
      if (contract.status === "active") {
        TestValidator.predicate(
          `active contract ${contract.id} has valid end_date`,
          () =>
            contract.end_date === null ||
            contract.end_date === undefined ||
            new Date(contract.end_date) > now,
        );
      }
    });
  }
  // 15. Test pagination with different page numbers
  const nextPage = await api.functional.hrmPlatform.member.contracts.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(nextPage);
  TestValidator.equals(
    "pagination page 2 current",
    nextPage.pagination.current,
    2,
  );
  TestValidator.equals("pagination page 2 limit", nextPage.pagination.limit, 5);
  // 16. Test with maximum limit
  const maxLimitPage = await api.functional.hrmPlatform.member.contracts.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "pagination max limit",
    maxLimitPage.pagination.limit,
    100,
  );
}
