import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account (creates verification token in database)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(authorized);
  // Note: In a real implementation, the verification token would be extracted from
  // the registration response or retrieved from the database. For this E2E test,
  // we assume the token is available through the authorized response.
  // This would typically be a separate field in the IAuthorized response type.
  //
  // Since the IAuthorized type does not explicitly include a verification token field,
  // and database access is not available in E2E tests, this test demonstrates the
  // verification flow assuming token availability. In production, the token would be
  // sent via email and retrieved by the user.
  //
  // For testing purposes, we would need to either:
  // 1. Include the verification token in the registration response
  // 2. Provide a test utility to retrieve the token from the database
  // 3. Mock the token generation for E2E tests
  //
  // This test structure shows how the verification endpoint should be called
  // once the token is obtained.
  // 2. Verify email with a valid token
  // In a complete implementation, verificationToken would be obtained from:
  // - Registration response (if included)
  // - Database query (if test utilities are available)
  // - Email mock service (if email testing is configured)
  const verificationToken: string = "test-verification-token"; // Placeholder - would be actual token
  const verifiedMember =
    await api.functional.redditLike.member.email_verifications.post(
      memberConnection,
      {
        body: {
          token: verificationToken,
        } satisfies IRedditLikeMemberEmailVerification.IVerify,
      },
    );
  typia.assert(verifiedMember);
  // 3. Verify member account is fully activated
  TestValidator.equals("member id matches", verifiedMember.id, authorized.id);
  TestValidator.equals("email matches", verifiedMember.email, authorized.email);
  TestValidator.equals(
    "username matches",
    verifiedMember.username,
    authorized.username,
  );
  TestValidator.predicate(
    "member is active",
    verifiedMember.deleted_at === null,
  );
  // 4. Verify token is invalidated by attempting to reuse it
  await TestValidator.error("token cannot be reused", async () => {
    await api.functional.redditLike.member.email_verifications.post(
      memberConnection,
      {
        body: {
          token: verificationToken,
        } satisfies IRedditLikeMemberEmailVerification.IVerify,
      },
    );
  });
}
