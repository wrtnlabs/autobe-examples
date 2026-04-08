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

export async function test_api_email_verification_retrieval_used_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with organization (creates email verification token)
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joined);
  // 2. Verify email verification token was created
  const emailVerifications = joined.emailVerifications;
  TestValidator.equals(
    "email verifications array exists",
    emailVerifications,
    Array.isArray(emailVerifications) ? emailVerifications : undefined,
  );
  TestValidator.predicate(
    "at least one email verification exists",
    emailVerifications !== undefined && emailVerifications.length > 0,
  );
  const emailVerification = emailVerifications![0];
  // 3. Retrieve the email verification token by ID
  const verification =
    await api.functional.hrmPlatform.member.email_verifications.at(
      memberConnection,
      { verificationId: emailVerification.id },
    );
  typia.assert(verification);
  // 4. Verify the token was used during registration (used_at is NOT null)
  TestValidator.notEquals(
    "used_at is not null after successful registration",
    verification.used_at,
    null,
  );
  // 5. Verify token identity and member reference
  TestValidator.equals(
    "token id matches retrieved verification",
    verification.id,
    emailVerification.id,
  );
  TestValidator.equals(
    "token member matches registered member",
    verification.member.id,
    joined.member.id,
  );
  TestValidator.equals(
    "token email matches registered member email",
    verification.member.email,
    joined.email,
  );
}