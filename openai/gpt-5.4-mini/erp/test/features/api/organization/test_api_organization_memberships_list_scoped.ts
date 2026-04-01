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

export async function test_api_organization_memberships_list_scoped(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/erp/signup",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuthorized);
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
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/erp/signup",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberAuthorized);
  const page =
    await api.functional.erpHrmTime.member.organizations.memberships.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          page: 1,
          limit: 50,
          isSelectedContext: true,
        } satisfies IErpHrmTimeOrganizationMembership.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("membership page current", page.pagination.current, 1);
  TestValidator.predicate(
    "membership page limit positive",
    page.pagination.limit > 0,
  );
  TestValidator.predicate(
    "membership page records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "membership page pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "membership rows stay in selected context",
    page.data.every((row) => row.isSelectedContext === true),
  );
  if (page.data.length > 0) {
    const memberId = page.data[0]!.member;
    const filtered =
      await api.functional.erpHrmTime.member.organizations.memberships.index(
        memberConnection,
        {
          organizationId: organization.id,
          body: {
            page: 1,
            limit: 50,
            memberId: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IErpHrmTimeOrganizationMembership.IRequest,
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      "filtered memberships remain scoped to the organization",
      filtered.data.every((row) => row.isSelectedContext === true),
    );
    TestValidator.predicate(
      "filtered memberships do not increase result count",
      filtered.pagination.records <= page.pagination.records,
    );
  }
}
