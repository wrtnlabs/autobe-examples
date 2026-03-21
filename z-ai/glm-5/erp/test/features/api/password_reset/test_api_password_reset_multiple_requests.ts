import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_multiple_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a test member account with a known email address
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Make first password reset request for the member's email
  await api.functional.erpHrm.member.password_resets.request(connection, {
    body: {
      email: memberEmail,
    } satisfies IErpHrmMemberPasswordReset.IRequest,
  });
  // 3. Make second password reset request for the same email immediately after
  await api.functional.erpHrm.member.password_resets.request(connection, {
    body: {
      email: memberEmail,
    } satisfies IErpHrmMemberPasswordReset.IRequest,
  });
  // 4. Verify both requests complete successfully - void response means 204 No Content
  // The system should handle multiple requests gracefully
  // Either invalidating previous tokens or allowing multiple active tokens
}
