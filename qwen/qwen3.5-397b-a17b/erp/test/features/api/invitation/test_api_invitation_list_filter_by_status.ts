import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_invitation_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Test filter by status=pending
  const pendingResult =
    await api.functional.hrmPlatform.member.invitations.index(
      memberConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
          sort: "invited_at",
          direction: "desc",
        } satisfies IHrmPlatformInvitation.IRequest,
      },
    );
  typia.assert(pendingResult);
  pendingResult.data.forEach((invitation) => {
    TestValidator.equals("pending status filter", invitation.status, "pending");
  });
  // 3. Test filter by status=accepted
  const acceptedResult =
    await api.functional.hrmPlatform.member.invitations.index(
      memberConnection,
      {
        body: {
          status: "accepted",
          page: 1,
          limit: 20,
          sort: "invited_at",
          direction: "desc",
        } satisfies IHrmPlatformInvitation.IRequest,
      },
    );
  typia.assert(acceptedResult);
  acceptedResult.data.forEach((invitation) => {
    TestValidator.equals(
      "accepted status filter",
      invitation.status,
      "accepted",
    );
    TestValidator.predicate(
      "accepted has accepted_at",
      invitation.accepted_at !== null,
    );
  });
  // 4. Test filter by status=expired
  const expiredResult =
    await api.functional.hrmPlatform.member.invitations.index(
      memberConnection,
      {
        body: {
          status: "expired",
          page: 1,
          limit: 20,
          sort: "invited_at",
          direction: "desc",
        } satisfies IHrmPlatformInvitation.IRequest,
      },
    );
  typia.assert(expiredResult);
  expiredResult.data.forEach((invitation) => {
    TestValidator.equals("expired status filter", invitation.status, "expired");
  });
  // 5. Test filter by status=revoked
  const revokedResult =
    await api.functional.hrmPlatform.member.invitations.index(
      memberConnection,
      {
        body: {
          status: "revoked",
          page: 1,
          limit: 20,
          sort: "invited_at",
          direction: "desc",
        } satisfies IHrmPlatformInvitation.IRequest,
      },
    );
  typia.assert(revokedResult);
  revokedResult.data.forEach((invitation) => {
    TestValidator.equals("revoked status filter", invitation.status, "revoked");
  });
  // 6. Test pagination with status filter
  const paginatedResult =
    await api.functional.hrmPlatform.member.invitations.index(
      memberConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
          sort: "invited_at",
          direction: "asc",
        } satisfies IHrmPlatformInvitation.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // 7. Test sorting with status filter
  const sortedResult =
    await api.functional.hrmPlatform.member.invitations.index(
      memberConnection,
      {
        body: {
          status: "accepted",
          page: 1,
          limit: 20,
          sort: "email",
          direction: "asc",
        } satisfies IHrmPlatformInvitation.IRequest,
      },
    );
  typia.assert(sortedResult);
}
