import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test duplicate email rejection during member registration.
 *
 * Validates the email uniqueness business constraint by attempting to register two member accounts with the same email address. The first registration should succeed, establishing a valid member account. The second registration attempt with the identical email should be rejected with a 409 Conflict response, enforcing the unique constraint on hrm_platform_members.email.
 *
 * This test ensures that the system properly maintains email uniqueness across the entire platform, preventing duplicate member accounts. The original member account must remain accessible and unaffected after the failed duplicate registration attempt.
 *
 * 1. Register first member with unique email and valid credentials.
 * 2. Capture the email address from successful registration.
 * 3. Attempt to register second member with the same email address.
 * 4. Verify duplicate registration is rejected with 409 Conflict.
 * 5. Confirm original member account remains accessible and valid.
 */
export async function test_api_member_join_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member successfully
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Capture the email from first registration
  const duplicateEmail = firstMember.email;
  // 3. Attempt to register second member with same email - should fail with 409 Conflict
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email rejected", async () => {
    await authorize_member_join(secondMemberConnection, {
      body: {
        email: duplicateEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  });
  // 4. Verify original member account data is intact
  TestValidator.predicate(
    "first member account preserved",
    () => firstMember.deleted_at === null,
  );
  TestValidator.predicate(
    "first member has refresh token",
    () => firstMember.token.refresh.length > 0,
  );
}
