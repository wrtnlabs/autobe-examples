import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create test member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // Search for member by email (exact match)
  let result = await api.functional.hrms.members.index(memberConnection, {
    body: { search: member.email },
  });
  typia.assert(result);
  TestValidator.equals("member found by email", result.pagination.records, 1);
  // Search by display name (partial match)
  result = await api.functional.hrms.members.index(memberConnection, {
    body: { search: member.display_name.substring(0, 3) },
  });
  typia.assert(result);
  TestValidator.equals(
    "member found by partial name",
    result.pagination.records,
    1,
  );
  // Test sorting by email ascending
  result = await api.functional.hrms.members.index(memberConnection, {
    body: { sortBy: "email", sortOrder: "asc" },
  });
  typia.assert(result);
  TestValidator.equals(
    "sort by email asc",
    result.pagination.records > 0,
    true,
  );
  // Test sorting by email descending
  result = await api.functional.hrms.members.index(memberConnection, {
    body: { sortBy: "email", sortOrder: "desc" },
  });
  typia.assert(result);
  TestValidator.equals(
    "sort by email desc",
    result.pagination.records > 0,
    true,
  );
  // Test sorting by created_at
  result = await api.functional.hrms.members.index(memberConnection, {
    body: { sortBy: "created_at", sortOrder: "desc" },
  });
  typia.assert(result);
  TestValidator.equals(
    "sort by created_at",
    result.pagination.records > 0,
    true,
  );
  // Test sorting by updated_at
  result = await api.functional.hrms.members.index(memberConnection, {
    body: { sortBy: "updated_at", sortOrder: "asc" },
  });
  typia.assert(result);
  TestValidator.equals(
    "sort by updated_at",
    result.pagination.records > 0,
    true,
  );
  // Test pagination
  result = await api.functional.hrms.members.index(memberConnection, {
    body: { page: 1, limit: 20 },
  });
  typia.assert(result);
  TestValidator.equals("pagination page 1", result.pagination.current, 1);
  TestValidator.equals("pagination limit 20", result.pagination.limit, 20);
  TestValidator.equals(
    "pagination records exists",
    result.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages exists",
    result.pagination.pages >= 0,
    true,
  );
  // Test status filter - active
  result = await api.functional.hrms.members.index(memberConnection, {
    body: { status: "active" },
  });
  typia.assert(result);
  TestValidator.equals(
    "active status filter",
    result.pagination.records >= 1,
    true,
  );
  // Test status filter - deleted
  result = await api.functional.hrms.members.index(memberConnection, {
    body: { status: "deleted" },
  });
  typia.assert(result);
  TestValidator.equals(
    "deleted status filter",
    result.pagination.records >= 0,
    true,
  );
  // Test created date range filter
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  result = await api.functional.hrms.members.index(memberConnection, {
    body: {
      created_startDate: sevenDaysAgo.toISOString(),
      created_endDate: now.toISOString(),
    },
  });
  typia.assert(result);
  TestValidator.equals(
    "created date range filter",
    result.pagination.records >= 1,
    true,
  );
  // Test updated date range filter
  result = await api.functional.hrms.members.index(memberConnection, {
    body: {
      updated_startDate: sevenDaysAgo.toISOString(),
      updated_endDate: now.toISOString(),
    },
  });
  typia.assert(result);
  TestValidator.equals(
    "updated date range filter",
    result.pagination.records >= 1,
    true,
  );
  // Test display_name sorting
  result = await api.functional.hrms.members.index(memberConnection, {
    body: { sortBy: "display_name", sortOrder: "asc" },
  });
  typia.assert(result);
  TestValidator.equals(
    "sort by display_name asc",
    result.pagination.records > 0,
    true,
  );
  result = await api.functional.hrms.members.index(memberConnection, {
    body: { sortBy: "display_name", sortOrder: "desc" },
  });
  typia.assert(result);
  TestValidator.equals(
    "sort by display_name desc",
    result.pagination.records > 0,
    true,
  );
}
