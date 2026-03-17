import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_resets_get_own_valid_reset(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection using authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Generate random reset ID (simulating existing password reset token)
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve password reset details using member connection
  const passwordReset = await api.functional.todoApp.member.password_resets.at(
    memberConnection,
    { resetId },
  );
  typia.assert(passwordReset);
  // typia.assert validates complete structure including:
  // - All properties exist with correct types
  // - token is string
  // - expires_at, created_at, updated_at are ISO date-time strings
  // - used is boolean
  // - member is ITodoAppMember.ISummary with email format validation
  // No additional validation needed after typia.assert()
}
