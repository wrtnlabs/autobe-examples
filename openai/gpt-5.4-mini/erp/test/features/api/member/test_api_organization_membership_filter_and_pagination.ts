import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeOrganizationMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_membership_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const firstPage =
    await api.functional.erpHrmTime.member.organizationMemberships.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IErpHrmTimeOrganizationMembership.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "page 1 should always echo requested page number",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 should always echo requested page limit",
    firstPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "records count must be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count must be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned page size must not exceed requested limit",
    firstPage.data.length <= 1,
  );
  const firstPageAgain =
    await api.functional.erpHrmTime.member.organizationMemberships.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IErpHrmTimeOrganizationMembership.IRequest,
      },
    );
  typia.assert(firstPageAgain);
  TestValidator.equals(
    "repeated requests with the same pagination should be stable",
    firstPage,
    firstPageAgain,
  );
  const expandedPage =
    await api.functional.erpHrmTime.member.organizationMemberships.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IErpHrmTimeOrganizationMembership.IRequest,
      },
    );
  typia.assert(expandedPage);
  TestValidator.equals(
    "expanded request should still target the first page",
    expandedPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "expanded request should echo the larger page limit",
    expandedPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "expanded page size must not exceed requested limit",
    expandedPage.data.length <= expandedPage.pagination.limit,
  );
  TestValidator.predicate(
    "expanded results must not exceed total record count",
    expandedPage.data.length <= expandedPage.pagination.records,
  );
  const selectedContextOnly =
    await api.functional.erpHrmTime.member.organizationMemberships.index(
      memberConnection,
      {
        body: {
          isSelectedContext: true,
          page: 1,
          limit: 100,
        } satisfies IErpHrmTimeOrganizationMembership.IRequest,
      },
    );
  typia.assert(selectedContextOnly);
  TestValidator.equals(
    "selected-context request should remain on page 1",
    selectedContextOnly.pagination.current,
    1,
  );
  TestValidator.equals(
    "selected-context request should echo requested limit",
    selectedContextOnly.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "selected-context results must not exceed the requested limit",
    selectedContextOnly.data.length <= selectedContextOnly.pagination.limit,
  );
  TestValidator.predicate(
    "selected-context results must not exceed total records",
    selectedContextOnly.data.length <= selectedContextOnly.pagination.records,
  );
  const byMemberId =
    await api.functional.erpHrmTime.member.organizationMemberships.index(
      memberConnection,
      {
        body: {
          memberId: authorized.id,
          page: 1,
          limit: 100,
        } satisfies IErpHrmTimeOrganizationMembership.IRequest,
      },
    );
  typia.assert(byMemberId);
  TestValidator.equals(
    "memberId-filtered request should stay on page 1",
    byMemberId.pagination.current,
    1,
  );
  TestValidator.equals(
    "memberId-filtered request should echo requested limit",
    byMemberId.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "memberId filter should not increase result count beyond unfiltered expanded page",
    byMemberId.data.length <= expandedPage.data.length,
  );
  TestValidator.predicate(
    "memberId filter should respect pagination bounds",
    byMemberId.data.length <= byMemberId.pagination.limit,
  );
  const combinedFilters =
    await api.functional.erpHrmTime.member.organizationMemberships.index(
      memberConnection,
      {
        body: {
          memberId: authorized.id,
          isSelectedContext: true,
          search: authorized.email as string,
          page: 1,
          limit: 100,
        } satisfies IErpHrmTimeOrganizationMembership.IRequest,
      },
    );
  typia.assert(combinedFilters);
  TestValidator.equals(
    "combined filters should remain on page 1",
    combinedFilters.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filters should echo requested limit",
    combinedFilters.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "combined filters should not exceed their limit",
    combinedFilters.data.length <= combinedFilters.pagination.limit,
  );
  TestValidator.predicate(
    "combined filters should stay within the selected organization scope",
    combinedFilters.data.length <= selectedContextOnly.data.length ||
      selectedContextOnly.data.length === 0,
  );
}
