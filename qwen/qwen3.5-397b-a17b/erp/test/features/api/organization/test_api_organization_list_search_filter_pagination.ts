import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

export async function test_api_organization_list_search_filter_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create multiple organizations with different names
  const org1 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: {
        name: "Acme Corporation",
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(org1);
  const org2 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: {
        name: "Beta Industries",
        currency: "EUR",
        timezone: "Europe/Berlin",
        fiscal_start_month: 4,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(org2);
  const org3 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: {
        name: "Acme Subsidiary",
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: 3,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(org3);
  // 3. Test search by name partial match (case-insensitive LIKE)
  const searchResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          search: "acme",
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns matching organizations",
    () => searchResult.data.length === 2,
  );
  TestValidator.predicate("all results contain 'acme' in name", () =>
    searchResult.data.every((org) => org.name.toLowerCase().includes("acme")),
  );
  // 4. Test pagination with limit
  const paginatedResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("page limit respected", paginatedResult.data.length, 2);
  TestValidator.equals(
    "total records count",
    paginatedResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "total pages calculated",
    paginatedResult.pagination.pages,
    2,
  );
  TestValidator.equals("current page", paginatedResult.pagination.current, 1);
  // 5. Test pagination page 2
  const page2Result =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 has remaining item", page2Result.data.length, 1);
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  // 6. Test sorting by name ascending
  const sortedAscResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          sort: "name",
          order: "asc",
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(sortedAscResult);
  TestValidator.predicate("names sorted ascending", () => {
    const names = sortedAscResult.data.map((org) => org.name);
    return names.every((name, i) => i === 0 || names[i - 1] <= name);
  });
  // 7. Test sorting by name descending
  const sortedDescResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          sort: "name",
          order: "desc",
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(sortedDescResult);
  TestValidator.predicate("names sorted descending", () => {
    const names = sortedDescResult.data.map((org) => org.name);
    return names.every((name, i) => i === 0 || names[i - 1] >= name);
  });
  // 8. Test sorting by created_at ascending
  const sortedByDateAsc =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          sort: "created_at",
          order: "asc",
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(sortedByDateAsc);
  TestValidator.predicate("created_at sorted ascending", () => {
    const dates = sortedByDateAsc.data.map((org) =>
      new Date(org.created_at).getTime(),
    );
    return dates.every((date, i) => i === 0 || dates[i - 1] <= date);
  });
  // 9. Test empty search result
  const emptySearchResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          search: "nonexistent_organization_xyz",
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns empty array",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search has zero records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has zero pages",
    emptySearchResult.pagination.pages,
    0,
  );
  // 10. Test combined search and pagination
  const combinedResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          search: "acme",
          page: 1,
          limit: 1,
          sort: "name",
          order: "asc",
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter returns 1 result",
    combinedResult.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter total records",
    combinedResult.pagination.records,
    2,
  );
  TestValidator.predicate("combined result matches search", () =>
    combinedResult.data[0].name.toLowerCase().includes("acme"),
  );
}
