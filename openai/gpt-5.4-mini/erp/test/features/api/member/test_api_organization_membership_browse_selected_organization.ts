import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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

export async function test_api_organization_membership_browse_selected_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const page =
    await api.functional.erpHrmTime.member.organizationMemberships.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IErpHrmTimeOrganizationMembership.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length within page limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "pagination metadata matches data size when first page is not partial by limit overflow",
    page.pagination.records >= page.data.length,
  );
  for (const membership of page.data) {
    typia.assert(membership);
    TestValidator.predicate(
      "membership status exists",
      membership.status.length > 0,
    );
    TestValidator.predicate(
      "membership selected context flag defined",
      typeof membership.isSelectedContext === "boolean",
    );
    TestValidator.predicate(
      "membership createdAt exists",
      membership.createdAt.length > 0,
    );
    TestValidator.predicate(
      "membership updatedAt exists",
      membership.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "membership deletedAt is nullable",
      membership.deletedAt === null || membership.deletedAt.length > 0,
    );
  }
  const statusSamples = ArrayUtil.repeat(2, () =>
    RandomGenerator.pick([
      "active",
      "invited",
      "pending",
      "deactivated",
    ] as const),
  );
  if (page.data.length > 0) {
    const firstStatus = page.data[0].status;
    const filteredByStatus =
      await api.functional.erpHrmTime.member.organizationMemberships.index(
        memberConnection,
        {
          body: {
            status: firstStatus,
            page: 1,
            limit: 20,
          } satisfies IErpHrmTimeOrganizationMembership.IRequest,
        },
      );
    typia.assert(filteredByStatus);
    for (const membership of filteredByStatus.data)
      TestValidator.equals("status filter", membership.status, firstStatus);
    const selectedOnly =
      await api.functional.erpHrmTime.member.organizationMemberships.index(
        memberConnection,
        {
          body: {
            isSelectedContext: true,
            page: 1,
            limit: 20,
          } satisfies IErpHrmTimeOrganizationMembership.IRequest,
        },
      );
    typia.assert(selectedOnly);
    for (const membership of selectedOnly.data)
      TestValidator.equals(
        "selected-context filter",
        membership.isSelectedContext,
        true,
      );
  }
}
