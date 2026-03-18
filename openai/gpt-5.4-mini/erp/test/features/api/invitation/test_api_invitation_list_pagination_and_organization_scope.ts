import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_invitation_list_pagination_and_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `member-${RandomGenerator.alphaNumeric(10)}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(authorized);
  const firstPage =
    await api.functional.hrmTimeTracking.member.invitations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 3,
          sort: "-createdAt",
        } satisfies IHrmTimeTrackingInvitation.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("page current", firstPage.pagination.current, 1);
  TestValidator.equals("page limit", firstPage.pagination.limit, 3);
  TestValidator.predicate(
    "records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length within requested limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "records should cover current page size",
    firstPage.pagination.records >= firstPage.data.length,
  );
  for (const item of firstPage.data) {
    typia.assert(item);
    TestValidator.predicate(
      "invitation has organization",
      item.organization.id.length > 0,
    );
    TestValidator.predicate("invitation has email", item.email.length > 0);
    TestValidator.predicate("invitation has status", item.status.length > 0);
    TestValidator.predicate(
      "invitation has createdAt",
      item.createdAt.length > 0,
    );
    TestValidator.predicate(
      "invitation has updatedAt",
      item.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "secret token not exposed",
      !Object.prototype.hasOwnProperty.call(item, "token"),
    );
    TestValidator.predicate(
      "summary should not expose unexpected invitation secret fields",
      !Object.prototype.hasOwnProperty.call(item, "secret"),
    );
  }
  if (firstPage.data.length > 1) {
    TestValidator.predicate(
      "stable ordering by createdAt descending when multiple records exist",
      firstPage.data.every(
        (item, index, array) =>
          index === 0 || array[index - 1].createdAt >= item.createdAt,
      ),
    );
  }
  const organizationIds = firstPage.data.map((item) => item.organization.id);
  if (organizationIds.length > 0) {
    const firstOrganizationId = organizationIds[0];
    TestValidator.predicate(
      "invitation list should stay within a single active organization context",
      organizationIds.every((id) => id === firstOrganizationId),
    );
  }
  const secondPage =
    await api.functional.hrmTimeTracking.member.invitations.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 3,
          sort: "-createdAt",
        } satisfies IHrmTimeTrackingInvitation.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 3);
  TestValidator.predicate(
    "second page data length within requested limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  for (const item of secondPage.data) {
    typia.assert(item);
    TestValidator.predicate(
      "second page summary remains organization scoped",
      item.organization.id.length > 0,
    );
    TestValidator.predicate(
      "second page summary omits secret token data",
      !Object.prototype.hasOwnProperty.call(item, "token"),
    );
  }
}
