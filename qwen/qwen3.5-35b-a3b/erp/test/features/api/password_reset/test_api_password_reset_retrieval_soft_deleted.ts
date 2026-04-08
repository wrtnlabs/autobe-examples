import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test password reset retrieval for soft-deleted record returns 404 not found.
 *
 * Validates that attempting to retrieve a password reset record that has been soft-deleted or does not exist returns a 404 not found error. This test ensures proper security by preventing access to expired or consumed password reset tokens, maintaining compliance with data retention policies.
 *
 * Since there is no direct API to create and delete password reset tokens, this test validates the 404 behavior by attempting to retrieve a password reset with a UUID that does not exist in the system. The API specification states that soft-deleted tokens should return 404, which is the same behavior as non-existent tokens.
 *
 * 1. Member account is created and authenticated.
 * 2. A password reset token retrieval is attempted with a non-existent UUID.
 * 3. The operation is verified to return a 404 status code, indicating the record was not found.
 * 4. The API properly excludes soft-deleted tokens from accessible views.
 */
export async function test_api_password_reset_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Step 2: Generate a UUID for non-existent password reset
  const nonExistentResetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Attempt to retrieve the non-existent password reset
  // This should return 404 since the token doesn't exist in the system
  await TestValidator.httpError(
    "non-existent password reset returns 404",
    404,
    async () => {
      await api.functional.hrmPlatform.member.password_resets.at(
        memberConnection,
        {
          resetId: nonExistentResetId,
        },
      );
    },
  );
}
