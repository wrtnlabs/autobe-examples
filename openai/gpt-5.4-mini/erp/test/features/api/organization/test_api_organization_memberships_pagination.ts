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
import { generate_random_erp_hrm_time_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_member_organizations_create";
import { prepare_random_erp_hrm_time_organization } from "../../../prepare/prepare_random_erp_hrm_time_organization";

export async function test_api_organization_memberships_pagination(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Aa",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/register",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const organization =
    await generate_random_erp_hrm_time_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organization);
  await Promise.all(
    ArrayUtil.repeat(6, async (index) => {
      const memberConnection: api.IConnection = { host: connection.host };
      const member = await authorize_member_join(memberConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "1234!Aa",
          name: `${RandomGenerator.name()} ${index}`,
          href: "https://example.com/join",
          referrer: "https://example.com/register",
        } satisfies IErpHrmTimeMember.IJoin,
      });
      typia.assert(member);
    }),
  );
  const firstPage =
    await api.functional.erpHrmTime.member.organizations.memberships.index(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          page: 1,
          limit: 3,
        } satisfies IErpHrmTimeOrganizationMembership.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 3);
  TestValidator.equals(
    "first page data size",
    firstPage.data.length,
    firstPage.pagination.limit,
  );
  TestValidator.equals(
    "first page pages contract",
    firstPage.pagination.pages,
    Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  TestValidator.predicate(
    "first page rows are scoped to one organization",
    firstPage.data.every(
      (row) => row.organization === firstPage.data[0].organization,
    ),
  );
  const secondPage =
    await api.functional.erpHrmTime.member.organizations.memberships.index(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          page: 2,
          limit: 3,
        } satisfies IErpHrmTimeOrganizationMembership.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 3);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "second page pages contract",
    secondPage.pagination.pages,
    Math.ceil(secondPage.pagination.records / secondPage.pagination.limit),
  );
  TestValidator.predicate(
    "page rows change across pagination",
    firstPage.data.length === 0 || secondPage.data.length === 0
      ? true
      : firstPage.data[0].id !== secondPage.data[0].id,
  );
  const largerPage =
    await api.functional.erpHrmTime.member.organizations.memberships.index(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IErpHrmTimeOrganizationMembership.IRequest,
      },
    );
  typia.assert(largerPage);
  TestValidator.equals("larger page current", largerPage.pagination.current, 1);
  TestValidator.equals("larger page limit", largerPage.pagination.limit, 5);
  TestValidator.equals(
    "larger page records",
    largerPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "larger page pages contract",
    largerPage.pagination.pages,
    Math.ceil(largerPage.pagination.records / largerPage.pagination.limit),
  );
  TestValidator.predicate(
    "larger page remains within organization scope",
    largerPage.data.every(
      (row) => row.organization === largerPage.data[0].organization,
    ),
  );
}
