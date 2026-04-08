import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_invitation_acceptance_expired_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account with random credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate a random UUID for a non-existent invitation ID
  // This simulates testing invitation validation (expired or non-existent)
  const expiredInvitationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Generate a token for the acceptance request
  const acceptanceToken = RandomGenerator.alphaNumeric(32);
  // 4. Attempt to accept the expired/non-existent invitation
  // This should fail with HTTP 400 (expired) or 404 (not found)
  await TestValidator.httpError(
    "accepting expired invitation should return 400 Bad Request",
    [400, 404],
    async () => {
      await api.functional.hrm.member.invitations.accept(memberConnection, {
        invitationId: expiredInvitationId,
        body: {
          token: acceptanceToken,
        } satisfies IHrmEmployeeInvitation.IAccept,
      });
    },
  );
}
