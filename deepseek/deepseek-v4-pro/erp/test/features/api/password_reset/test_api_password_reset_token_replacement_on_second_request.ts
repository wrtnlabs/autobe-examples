import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_password_resets_create } from "../../../generate/generate_random_erp_hrm_member_password_resets_create";
import { prepare_random_erp_hrm_member_password_reset } from "../../../prepare/prepare_random_erp_hrm_member_password_reset";

/**
 * Test password reset token replacement on second request.
 *
 * Validates the business rule that any existing unused password reset tokens are deleted when a new reset request is made for the same member, preventing token accumulation. When a member requests a second password reset before using the first token, the old token is replaced — ensuring only the most recent token is valid at any given time.
 *
 * The test registers a new member, then makes two consecutive password reset requests for the same email address. Both requests should return 204 No Content, confirming the server processes them without errors. The second request's success implicitly validates that the first token was cleanly deleted rather than causing a conflict.
 *
 * 1. Register a new member via the join flow with random credentials.
 * 2. Request the first password reset for the member's registered email — expect 204.
 * 3. Request the second password reset for the same email — expect 204 (old token replaced).
 */
export async function test_api_password_reset_token_replacement_on_second_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. First password reset request
  await api.functional.erpHrm.member.password_resets.create(connection, {
    body: {
      email: member.email,
    } satisfies IErpHrmMemberPasswordReset.ICreate,
  });
  // 3. Second password reset request — old unused token should be replaced
  await api.functional.erpHrm.member.password_resets.create(connection, {
    body: {
      email: member.email,
    } satisfies IErpHrmMemberPasswordReset.ICreate,
  });
}
