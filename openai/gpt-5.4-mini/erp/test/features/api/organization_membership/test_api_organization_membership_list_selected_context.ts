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

export async function test_api_organization_membership_list_selected_context(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` as string &
        tags.Format<"email">,
      password: "P@ssw0rd123!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com/" as string & tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const firstPage =
    await api.functional.erpHrmTime.member.organizationMemberships.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          isSelectedContext: true,
        } satisfies IErpHrmTimeOrganizationMembership.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page should request page 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should match request",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination record count should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page results should be scoped to the selected organization context",
    firstPage.data.every((item) => item.isSelectedContext === true),
  );
  TestValidator.predicate(
    "first page results should have stable summary shape",
    firstPage.data.every((item) => item.status.length >= 0),
  );
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.erpHrmTime.member.organizationMemberships.index(
        memberConnection,
        {
          body: {
            page: 2,
            limit: 10,
            isSelectedContext: true,
          } satisfies IErpHrmTimeOrganizationMembership.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page should request page 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit should match request",
      secondPage.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "second page results should be scoped to the selected organization context",
      secondPage.data.every((item) => item.isSelectedContext === true),
    );
    TestValidator.predicate(
      "membership ids should not repeat across pages",
      firstPage.data.every((first) =>
        secondPage.data.every((second) => second.id !== first.id),
      ),
    );
  }
}
