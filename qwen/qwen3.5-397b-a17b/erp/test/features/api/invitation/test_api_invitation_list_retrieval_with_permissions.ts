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

export async function test_api_invitation_list_retrieval_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // 2. Retrieve invitation list with default parameters
  const invitationList =
    await api.functional.hrmPlatform.member.invitations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "invited_at",
          direction: "desc",
        } satisfies IHrmPlatformInvitation.IRequest,
      },
    );
  typia.assert(invitationList);
  // 3. Validate pagination metadata consistency
  TestValidator.predicate(
    "pages calculation is consistent",
    invitationList.pagination.pages ===
      Math.ceil(
        invitationList.pagination.records / invitationList.pagination.limit,
      ),
  );
  // 4. Validate data array structure
  TestValidator.predicate(
    "data length matches limit or records",
    invitationList.data.length <= invitationList.pagination.limit &&
      invitationList.data.length <= invitationList.pagination.records,
  );
  // 5. Validate invited_by member summary structure for each invitation
  for (const invitation of invitationList.data) {
    TestValidator.predicate(
      "invited_by has required member fields",
      invitation.invited_by.id !== undefined &&
        invitation.invited_by.display_name !== undefined &&
        invitation.invited_by.avatar_image !== undefined &&
        invitation.invited_by.phone_number !== undefined,
    );
  }
}
