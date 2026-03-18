import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_member_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member to establish session context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: "Asia/Seoul",
      locale: "en-US",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 2. Call organizationMembers index with comprehensive filtering
  const requestBody = {
    roleIds: [
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
    ],
    departmentIds: [
      typia.random<string & tags.Format<"uuid">>(),
      "unassigned" as const,
    ],
    isActive: true,
    employmentType: ["full_time", "part_time"] as const,
    limit: 20,
    page: 1,
  } satisfies IErpHrmOrganizationMember.IRequest;
  const response = await api.functional.erpHrm.member.organizationMembers.index(
    memberConnection,
    { body: requestBody },
  );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate returned organization members match filter criteria
  for (const member of response.data) {
    // Verify is_active matches filter
    TestValidator.equals(
      "member is_active matches filter",
      member.is_active,
      true,
    );
    // Verify employment type matches requested types
    const validEmploymentTypes = ["full_time", "part_time"];
    TestValidator.predicate(
      "member employment_type is in requested types",
      validEmploymentTypes.includes(member.employment_type),
    );
  }
  // 5. Validate total records consistency
  if (response.pagination.records === 0) {
    TestValidator.equals(
      "pages should be 0 when no records",
      response.pagination.pages,
      0,
    );
  } else {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation is correct",
      response.pagination.pages,
      expectedPages,
    );
  }
}
