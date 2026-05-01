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
 * Test email enumeration prevention in password reset flow.
 *
 * Validates that the password reset endpoint does not reveal whether an email address is registered in the system. When a password reset is requested with an email that does not belong to any member, the system must return 204 No Content — identical to the response for a valid registered email. This prevents attackers from enumerating registered email addresses through the password reset mechanism.
 *
 * 1. Authenticate a new member via join to establish member context.
 * 2. Request password reset with a non-existent email address ("nonexistent@example.com").
 * 3. Verify the response is void (204 No Content), confirming no information leakage about email registration status.
 */
export async function test_api_password_reset_nonexistent_email_no_enumeration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Request password reset with a non-existent email
  // The API returns 204 No Content regardless of whether the email exists,
  // preventing attackers from enumerating registered email addresses.
  await generate_random_erp_hrm_member_password_resets_create(
    memberConnection,
    {
      body: {
        email: "nonexistent@example.com",
      },
    },
  );
}
