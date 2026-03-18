import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_browse_accessible_list(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const snapshot = {
    id: member.id,
    email: member.email,
    isActive: member.isActive,
    lastLoginAt: member.lastLoginAt,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
    deletedAt: member.deletedAt,
    token: {
      access: member.token.access,
      refresh: member.token.refresh,
      expired_at: member.token.expired_at,
      refreshable_until: member.token.refreshable_until,
    } satisfies IAuthorizationToken,
  } satisfies IHrmTimeTrackingMember.IAuthorized;
  const output =
    await api.functional.hrmTimeTracking.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmTimeTrackingOrganization.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "member authorization response should remain unchanged after browsing organizations",
    snapshot,
    {
      id: member.id,
      email: member.email,
      isActive: member.isActive,
      lastLoginAt: member.lastLoginAt,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      deletedAt: member.deletedAt,
      token: {
        access: member.token.access,
        refresh: member.token.refresh,
        expired_at: member.token.expired_at,
        refreshable_until: member.token.refreshable_until,
      } satisfies IAuthorizationToken,
    } satisfies IHrmTimeTrackingMember.IAuthorized,
  );
  TestValidator.predicate(
    "organization browse response should be paginated",
    output.pagination.current >= 1 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "organization browse should return summary records",
    output.data.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.currency === "string" &&
        typeof item.timezone === "string",
    ),
  );
}
