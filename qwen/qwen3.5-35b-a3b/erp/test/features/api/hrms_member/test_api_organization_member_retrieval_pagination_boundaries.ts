import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_member_retrieval_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(auth);
  // Create connection with token for API calls
  const apiConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: auth.token.access },
  };
  // 2. Maximum limit test: limit=100 (max allowed value)
  const maxLimitInput = {
    limit: 100,
    page: 1,
  } satisfies IHrmsOrganizationMember.IRequest;
  const maxLimitResult =
    await api.functional.hrms.member.organization_members.index(apiConnection, {
      body: maxLimitInput,
    });
  typia.assert(maxLimitResult);
  // Validate pagination fields for max limit
  TestValidator.equals(
    "max limit pagination - limit field",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.equals(
    "max limit pagination - current field",
    maxLimitResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "max limit pagination - records exists",
    maxLimitResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "max limit pagination - pages calculated",
    maxLimitResult.pagination.pages >= 0,
  );
  // 3. Default pagination test (no limit specified, should default to 20)
  const defaultPaginationResult =
    await api.functional.hrms.member.organization_members.index(apiConnection, {
      body: { page: 1 },
    });
  typia.assert(defaultPaginationResult);
  // Validate default limit is reasonable (should be <= 100 as per constraints)
  TestValidator.predicate(
    "default pagination - limit within constraints",
    defaultPaginationResult.pagination.limit >= 1 &&
      defaultPaginationResult.pagination.limit <= 100,
  );
  // 4. Search with limit test
  const searchWithLimit = RandomGenerator.name(3);
  const searchLimitInput = {
    search: searchWithLimit,
    limit: 10,
    search_limit: 50,
  } satisfies IHrmsOrganizationMember.IRequest;
  const searchLimitResult =
    await api.functional.hrms.member.organization_members.index(apiConnection, {
      body: searchLimitInput,
    });
  typia.assert(searchLimitResult);
  // Validate search results respect search_limit (max 50)
  TestValidator.predicate(
    "search limit pagination - records within search_limit",
    searchLimitResult.pagination.records <= 50,
  );
  TestValidator.equals(
    "search limit pagination - limit field",
    searchLimitResult.pagination.limit,
    10,
  );
  // 5. Page boundary edge case: Request page beyond total pages
  const totalPages = defaultPaginationResult.pagination.pages;
  const beyondLastPage = totalPages + 10;
  const beyondPageInput = {
    page: beyondLastPage,
    limit: 20,
  } satisfies IHrmsOrganizationMember.IRequest;
  const beyondPageResult =
    await api.functional.hrms.member.organization_members.index(apiConnection, {
      body: beyondPageInput,
    });
  typia.assert(beyondPageResult);
  // Validate behavior for page beyond total (should return empty data or handle gracefully)
  // System should not crash - just return empty or handle gracefully
  TestValidator.predicate(
    "beyond page - pagination fields present",
    beyondPageResult.pagination.current !== undefined &&
      beyondPageResult.pagination.limit !== undefined &&
      beyondPageResult.pagination.records !== undefined &&
      beyondPageResult.pagination.pages !== undefined,
  );
  // Data array should be valid
  TestValidator.predicate(
    "beyond page - data is array",
    Array.isArray(beyondPageResult.data),
  );
  // 6. Multiple page navigation test
  const pageResults = await Promise.all(
    ArrayUtil.repeat(3, async (pageIndex) => {
      const pageRequest = pageIndex + 1;
      const pageResult = await api.functional.hrms.member.organization_members.index(
        apiConnection,
        {
          body: {
            page: pageRequest,
            limit: 10,
          },
        },
      );
      typia.assert(pageResult);
      return pageResult;
    }),
  );
  // Validate no duplicate records across pages
  const allMemberIds = pageResults.flatMap((result) =>
    result.data.map((member) => member.member.id),
  );
  const uniqueMemberIds = new Set(allMemberIds);
  TestValidator.equals(
    "multiple pages - no duplicate member IDs",
    uniqueMemberIds.size,
    allMemberIds.length,
  );
  // Validate pagination metadata consistency
  for (let i = 0; i < pageResults.length; i++) {
    const pageResult = pageResults[i];
    const expectedPage = i + 1;
    TestValidator.equals(
      `page ${expectedPage} - current page number`,
      pageResult.pagination.current,
      expectedPage,
    );
    TestValidator.equals(
      `page ${expectedPage} - limit is consistent`,
      pageResult.pagination.limit,
      10,
    );
  }
}