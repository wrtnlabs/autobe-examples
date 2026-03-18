import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_invitation_delete_after_email_resolution(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "member email should match sign-up input",
    authorized.email,
    memberEmail,
  );
  TestValidator.predicate(
    "member account should be active after sign-up",
    authorized.isActive === true,
  );
  TestValidator.predicate(
    "authorization token should include access token",
    authorized.token.access.length > 0,
  );
  const invitationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleting a resolved or non-existent invitation should fail consistently",
    [400, 404, 409],
    async () => {
      await api.functional.hrmTimeTracking.member.invitations.erase(
        memberConnection,
        {
          invitationId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "deleting another missing invitation should also be rejected",
    [400, 404, 409],
    async () => {
      await api.functional.hrmTimeTracking.member.invitations.erase(
        memberConnection,
        {
          invitationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
