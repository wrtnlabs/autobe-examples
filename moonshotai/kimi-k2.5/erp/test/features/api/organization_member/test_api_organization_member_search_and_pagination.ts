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

export async function test_api_organization_member_search_and_pagination(
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
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 2. Test basic organization members listing
  const initialRequest = {
    limit: 10,
  } satisfies IErpHrmOrganizationMember.IRequest;
  const initialResponse: IPageIErpHrmOrganizationMember.ISummary =
    await api.functional.erpHrm.member.organizationMembers.index(
      memberConnection,
      {
        body: initialRequest,
      },
    );
  typia.assert(initialResponse);
  // 3. Test text search functionality with various search terms
  const searchTerms = ["Dev", "Manager", "Eng", "Test"];
  for (const searchTerm of searchTerms) {
    const searchRequest = {
      search: searchTerm,
      limit: 20,
    } satisfies IErpHrmOrganizationMember.IRequest;
    const searchResponse: IPageIErpHrmOrganizationMember.ISummary =
      await api.functional.erpHrm.member.organizationMembers.index(
        memberConnection,
        {
          body: searchRequest,
        },
      );
    typia.assert(searchResponse);
    // If results returned, verify they match search criteria (case-insensitive)
    if (searchResponse.data.length > 0) {
      const searchTermLower = searchTerm.toLowerCase();
      for (const member of searchResponse.data) {
        const user = member.user;
        const position = member.position ?? "";
        const matchesSearch =
          user.firstName.toLowerCase().includes(searchTermLower) ||
          user.lastName.toLowerCase().includes(searchTermLower) ||
          user.email.toLowerCase().includes(searchTermLower) ||
          position.toLowerCase().includes(searchTermLower);
        TestValidator.predicate(
          `search result matches criteria for term "${searchTerm}"`,
          matchesSearch,
        );
      }
    }
  }
  // 4. Test pagination with page parameter
  const page1Request = {
    limit: 5,
    page: 1,
  } satisfies IErpHrmOrganizationMember.IRequest;
  const page1Response: IPageIErpHrmOrganizationMember.ISummary =
    await api.functional.erpHrm.member.organizationMembers.index(
      memberConnection,
      {
        body: page1Request,
      },
    );
  typia.assert(page1Response);
  // If there are more records, test page 2
  if (page1Response.pagination.records > 5) {
    const page2Request = {
      limit: 5,
      page: 2,
    } satisfies IErpHrmOrganizationMember.IRequest;
    const page2Response: IPageIErpHrmOrganizationMember.ISummary =
      await api.functional.erpHrm.member.organizationMembers.index(
        memberConnection,
        {
          body: page2Request,
        },
      );
    typia.assert(page2Response);
    TestValidator.equals(
      "page 2 current page number",
      page2Response.pagination.current,
      2,
    );
    // Verify different data on page 2
    if (page1Response.data.length > 0 && page2Response.data.length > 0) {
      TestValidator.notEquals(
        "page 1 and page 2 have different data",
        page1Response.data[0].id,
        page2Response.data[0].id,
      );
    }
  }
  // 5. Test page-based pagination with different page sizes
  const pageSizes = [5, 10] as const;
  for (const pageSize of pageSizes) {
    const pageRequest = {
      limit: pageSize,
      page: 1,
    } satisfies IErpHrmOrganizationMember.IRequest;
    const pageResponse: IPageIErpHrmOrganizationMember.ISummary =
      await api.functional.erpHrm.member.organizationMembers.index(
        memberConnection,
        {
          body: pageRequest,
        },
      );
    typia.assert(pageResponse);
    TestValidator.equals(
      `page limit matches request for size ${pageSize}`,
      pageResponse.pagination.limit,
      pageSize,
    );
  }
  // 6. Test employment_type filter as single value
  const employmentTypes = [
    "full_time",
    "part_time",
    "contractor",
    "intern",
  ] as const;
  for (const employmentType of employmentTypes) {
    const singleTypeRequest = {
      employmentType,
      limit: 10,
    } satisfies IErpHrmOrganizationMember.IRequest;
    const singleTypeResponse: IPageIErpHrmOrganizationMember.ISummary =
      await api.functional.erpHrm.member.organizationMembers.index(
        memberConnection,
        {
          body: singleTypeRequest,
        },
      );
    typia.assert(singleTypeResponse);
    // Verify all returned members match the employment type filter
    for (const member of singleTypeResponse.data) {
      TestValidator.equals(
        `member employment_type matches single filter ${employmentType}`,
        member.employment_type,
        employmentType,
      );
    }
  }
  // 7. Test employment_type filter as array of values
  const employmentTypeArrays: Array<
    ("full_time" | "part_time" | "contractor" | "intern")[]
  > = [
    ["full_time", "part_time"],
    ["contractor", "intern"],
    ["full_time", "contractor"],
  ];
  for (const employmentTypeArray of employmentTypeArrays) {
    const arrayTypeRequest = {
      employmentType: employmentTypeArray,
      limit: 10,
    } satisfies IErpHrmOrganizationMember.IRequest;
    const arrayTypeResponse: IPageIErpHrmOrganizationMember.ISummary =
      await api.functional.erpHrm.member.organizationMembers.index(
        memberConnection,
        {
          body: arrayTypeRequest,
        },
      );
    typia.assert(arrayTypeResponse);
    // Verify all returned members match one of the employment types in the array
    for (const member of arrayTypeResponse.data) {
      TestValidator.predicate(
        `member employment_type ${member.employment_type} is in filter array`,
        employmentTypeArray.includes(
          member.employment_type as
            | "full_time"
            | "part_time"
            | "contractor"
            | "intern",
        ),
      );
    }
  }
  // 8. Test response when no members match filters
  const nonMatchingSearchRequest = {
    search: "XYZ_NONEXISTENT_SEARCH_TERM_12345",
    limit: 10,
  } satisfies IErpHrmOrganizationMember.IRequest;
  const emptyResponse: IPageIErpHrmOrganizationMember.ISummary =
    await api.functional.erpHrm.member.organizationMembers.index(
      memberConnection,
      {
        body: nonMatchingSearchRequest,
      },
    );
  typia.assert(emptyResponse);
  // Verify empty data array and pagination metadata
  TestValidator.equals(
    "empty response has empty data array",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty response has zero records in pagination",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty response has zero pages in pagination",
    emptyResponse.pagination.pages,
    0,
  );
  // 9. Test combined filters (search + employment_type + pagination)
  const combinedRequest = {
    search: "a",
    employmentType: "full_time",
    limit: 5,
    page: 1,
  } satisfies IErpHrmOrganizationMember.IRequest;
  const combinedResponse: IPageIErpHrmOrganizationMember.ISummary =
    await api.functional.erpHrm.member.organizationMembers.index(
      memberConnection,
      {
        body: combinedRequest,
      },
    );
  typia.assert(combinedResponse);
  // Verify all results match combined filters
  for (const member of combinedResponse.data) {
    TestValidator.equals(
      "combined filter result has correct employment_type",
      member.employment_type,
      "full_time",
    );
  }
}