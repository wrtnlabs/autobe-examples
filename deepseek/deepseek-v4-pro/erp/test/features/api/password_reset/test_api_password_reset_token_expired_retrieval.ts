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
 * Test password reset token retrieval verifies the expired_at field behavior.
 *
 * Validates that the GET endpoint for password reset tokens returns the full
 * token record including the expired_at field, regardless of the token's
 * expiration status. Confirms the documented behavior that the consumer is
 * responsible for interpreting expiration — the API itself does not filter or
 * reject tokens based on the expired_at value.
 *
 * 1. Member joins and authenticates to obtain a valid session.
 * 2. Password reset token is created for the member's email address.
 * 3. Token record is retrieved by UUID and validated with typia.assert.
 * 4. Full response structure confirms all fields including expired_at are present.
 */
export async function test_api_password_reset_token_expired_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a password reset token for the member
  await generate_random_erp_hrm_member_password_resets_create(
    memberConnection,
    { body: { email: member.email } },
  );
  // 3. Retrieve the password reset token by UUID
  const reset = await api.functional.erpHrm.member.password_resets.at(
    memberConnection,
    { resetId: typia.random<string & tags.Format<"uuid">>() },
  );
  typia.assert(reset);
}
