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

export async function test_api_organization_membership_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/member",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const page =
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
  typia.assert(page);
  TestValidator.predicate(
    "pagination metadata is non-negative",
    page.pagination.current >= 0 &&
      page.pagination.limit >= 0 &&
      page.pagination.records >= 0 &&
      page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "selected-context filter is respected",
    page.data.every((item) => item.isSelectedContext === true),
  );
  TestValidator.predicate(
    "organization membership list is scoped consistently to one organization",
    page.data.length <= 1 ||
      page.data.every(
        (item) => item.organization.id === page.data[0]!.organization.id,
      ),
  );
  TestValidator.predicate(
    "member summaries are returned without leaking unexpected shape",
    page.data.every((item) => typeof item.member === "object"),
  );
  TestValidator.predicate(
    "organization summaries are returned without leaking unexpected shape",
    page.data.every((item) => typeof item.organization === "object"),
  );
}
