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

export async function test_api_password_reset_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and organization via join
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_description: "Test organization for password reset test",
      org_timezone: "UTC",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a member-specific connection for authenticated API calls
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 3. Generate a password reset record for testing
  // Since no POST endpoint exists in the SDK for creating password reset tokens,
  // we use typia.random to generate a valid test record matching the database schema
  const passwordResetRecord = typia.random<IHrmPlatformMemberPasswordReset>();
  typia.assert(passwordResetRecord);
  // Ensure the password reset's member matches the created member for accurate testing
  passwordResetRecord.member = memberAuth.member;
  // Ensure token is unused (used_at is null)
  passwordResetRecord.used_at = null;
  // 4. Retrieve the password reset record using GET endpoint with member connection
  const retrievedReset =
    await api.functional.hrmPlatform.member.password_resets.at(
      memberConnection,
      {
        resetId: passwordResetRecord.id,
      },
    );
  typia.assert(retrievedReset);
  // 5. Validate the response
  // 5.1. Validate password reset metadata
  TestValidator.equals(
    "password reset id matches",
    retrievedReset.id,
    passwordResetRecord.id,
  );
  TestValidator.equals(
    "password reset token matches",
    retrievedReset.token,
    passwordResetRecord.token,
  );
  // 5.2. Validate token status - should be unused (used_at is null)
  TestValidator.equals("token unused", retrievedReset.used_at, null);
  // 5.3. Validate token not expired - expired_at should be in the future
  TestValidator.predicate(
    "token not expired (expired_at in future)",
    new Date(retrievedReset.expired_at) > new Date(),
  );
  // 5.4. Validate token not soft-deleted
  TestValidator.equals(
    "token not soft-deleted",
    retrievedReset.deleted_at,
    null,
  );
  // 5.5. Validate member association
  TestValidator.equals(
    "member id matches",
    retrievedReset.member.id,
    memberAuth.member.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedReset.member.email,
    memberAuth.email,
  );
}
