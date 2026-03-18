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

export async function test_api_invitation_list_authorization_and_tenant_isolation(
  connection: api.IConnection,
): Promise<void> {
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const authorizedConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(authorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  await TestValidator.error(
    "unauthorized member cannot browse invitations",
    async () => {
      await api.functional.hrmTimeTracking.member.invitations.index(
        unauthorizedConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IHrmTimeTrackingInvitation.IRequest,
        },
      );
    },
  );
  const page = await api.functional.hrmTimeTracking.member.invitations.index(
    authorizedConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackingInvitation.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page should match request",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    page.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "invitation list response should be an array",
    Array.isArray(page.data),
  );
}
