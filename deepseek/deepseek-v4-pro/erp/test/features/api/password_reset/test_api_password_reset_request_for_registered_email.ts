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
 * Test password reset request for a registered email address.
 *
 * Validates that a member who has registered can successfully initiate a password
 * reset flow by providing their registered email. The endpoint returns 204 No
 * Content regardless of whether the email lookup matched an active account, to
 * prevent email enumeration attacks. A cryptographically secure reset token is
 * generated internally for valid registered emails.
 *
 * 1. A new member registers via the join endpoint with randomized credentials.
 * 2. The member requests a password reset using their registered email.
 * 3. The system returns 204 No Content (void response), confirming the reset
 *    flow was initiated successfully for the registered email.
 */
export async function test_api_password_reset_request_for_registered_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, { body: {} });
  typia.assert(member);
  // 2. Request password reset with the registered email
  await generate_random_erp_hrm_member_password_resets_create(connection, {
    body: { email: member.email },
  });
}
