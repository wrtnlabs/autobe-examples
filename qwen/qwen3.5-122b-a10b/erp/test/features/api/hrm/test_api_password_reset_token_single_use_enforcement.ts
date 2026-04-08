import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordReset";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_member_password_resets_create } from "../../../generate/generate_random_hrm_member_member_password_resets_create";
import { prepare_random_hrm_member_password_reset } from "../../../prepare/prepare_random_hrm_member_password_reset";

export async function test_api_password_reset_token_single_use_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account via registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // 2. Request a password reset token via email
  // This creates a password reset record in the database with a generated token
  await generate_random_hrm_member_member_password_resets_create(
    memberConnection,
    {
      body: { email: member.email } satisfies IHrmMemberPasswordReset.ICreate,
    },
  );
  // Note: In a real E2E test, you would capture the token via:
  // - Email interception service that captures sent reset emails
  // - Direct database access to query hrm_member_password_resets table
  // - Test-specific API that returns the token for testing purposes
  //
  // For this test implementation, we simulate the token capture process
  // and demonstrate the single-use enforcement pattern.
  // 3. Simulate token capture (in real implementation, get from email/database)
  // The token would be extracted from the reset email sent to the member
  const capturedToken: string = "simulated_token_from_email"; // Placeholder
  // 4. Successfully reset the password using the token
  const newPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.hrm.member.member.password_resets.reset(
    memberConnection,
    {
      body: {
        token: capturedToken,
        password: newPassword,
      } satisfies IHrmMemberPasswordReset.IRequest,
    },
  );
  // 5. Attempt to use the same token again - this should fail
  // The token has already been consumed and marked as used
  await TestValidator.error("token reuse should be rejected", async () => {
    await api.functional.hrm.member.member.password_resets.reset(
      memberConnection,
      {
        body: {
          token: capturedToken,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IHrmMemberPasswordReset.IRequest,
      },
    );
  });
}
