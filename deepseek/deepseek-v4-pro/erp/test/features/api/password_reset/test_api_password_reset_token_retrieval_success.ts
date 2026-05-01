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
 * Test password reset token retrieval after successful token creation.
 *
 * Validates the complete flow of creating a password reset token for an authenticated member and retrieving it by its unique identifier. The retrieval endpoint returns the full token record including the cryptographically secure token string, the associated member summary, and timestamp metadata.
 *
 * Ensures that the token string is present and non-empty, the member reference in the response matches the authenticated member who requested the reset, and the expiration timestamp is logically after the creation timestamp.
 *
 * 1. Member registers and authenticates via the join endpoint.
 * 2. A password reset token is generated for the member's email address.
 * 3. The token record is retrieved by its reset identifier.
 * 4. The response structure is validated for field completeness.
 * 5. Business logic validations confirm token content and timestamp consistency.
 */
export async function test_api_password_reset_token_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a password reset token for the member
  await generate_random_erp_hrm_member_password_resets_create(
    memberConnection,
    {
      body: {
        email: member.email,
      },
    },
  );
  // 3. Retrieve the password reset token by its identifier
  const reset = await api.functional.erpHrm.member.password_resets.at(
    memberConnection,
    {
      resetId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(reset);
  // 4. Validate business logic
  TestValidator.predicate("token is non-empty", reset.token.length > 0);
  TestValidator.equals("member id matches", reset.member.id, member.id);
  TestValidator.equals(
    "member email matches",
    reset.member.email,
    member.email,
  );
  TestValidator.equals(
    "member display name matches",
    reset.member.display_name,
    member.display_name,
  );
  TestValidator.predicate(
    "expired_at is after created_at",
    new Date(reset.expired_at).getTime() > new Date(reset.created_at).getTime(),
  );
}
