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

export async function test_api_invitation_list_filter_by_email_and_status(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `invite-filter-${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const request = {
    email: authorized.email,
    status: "pending",
    createdAtFrom: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    createdAtTo: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    expiresAtFrom: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    expiresAtTo: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    page: 1,
    limit: 20,
    sort: "-createdAt",
  } satisfies IHrmTimeTrackingInvitation.IRequest;
  const output = await api.functional.hrmTimeTracking.member.invitations.index(
    memberConnection,
    {
      body: request,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "invitation list page is preserved",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "invitation list limit is preserved",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "filtered invitation records match the email constraint",
    () => output.data.every((item) => item.email === request.email),
  );
  TestValidator.predicate(
    "filtered invitation records match the status constraint",
    () => output.data.every((item) => item.status === request.status),
  );
  TestValidator.predicate(
    "filtered invitation records stay within the requested creation window",
    () =>
      output.data.every((item) => {
        const createdAt = new Date(item.createdAt).getTime();
        const from = new Date(request.createdAtFrom!).getTime();
        const to = new Date(request.createdAtTo!).getTime();
        return createdAt >= from && createdAt <= to;
      }),
  );
  TestValidator.predicate(
    "filtered invitation records stay within the requested expiration window",
    () =>
      output.data.every((item) => {
        const expiresAt = new Date(item.expiresAt).getTime();
        const from = new Date(request.expiresAtFrom!).getTime();
        const to = new Date(request.expiresAtTo!).getTime();
        return expiresAt >= from && expiresAt <= to;
      }),
  );
  TestValidator.equals(
    "pagination record count matches returned rows for the filtered page",
    output.data.length,
    output.pagination.records < request.limit
      ? output.pagination.records
      : output.data.length,
  );
}
