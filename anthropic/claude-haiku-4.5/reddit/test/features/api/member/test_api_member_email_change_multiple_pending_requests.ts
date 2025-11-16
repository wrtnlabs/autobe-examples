import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_email_change_multiple_pending_requests(
  connection: api.IConnection,
) {
  // Step 1: Create an authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(8);

  const createdMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(1),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(createdMember);

  // Step 2: Request first email change
  const firstNewEmail = typia.random<string & tags.Format<"email">>();
  const firstEmailChangeResponse =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: firstNewEmail,
          password: memberPassword,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(firstEmailChangeResponse);
  TestValidator.predicate(
    "first email change request should succeed",
    firstEmailChangeResponse.success === true,
  );
  TestValidator.equals(
    "first verification email sent to correct address",
    firstEmailChangeResponse.verification_email_sent_to,
    firstNewEmail,
  );

  // Step 3: Request second email change (with different email) before verifying the first one
  const secondNewEmail = typia.random<string & tags.Format<"email">>();
  const secondEmailChangeResponse =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: secondNewEmail,
          password: memberPassword,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(secondEmailChangeResponse);
  TestValidator.predicate(
    "second email change request should succeed",
    secondEmailChangeResponse.success === true,
  );
  TestValidator.equals(
    "second verification email sent to correct address",
    secondEmailChangeResponse.verification_email_sent_to,
    secondNewEmail,
  );

  // Step 4: Request third email change to further verify token invalidation
  const thirdNewEmail = typia.random<string & tags.Format<"email">>();
  const thirdEmailChangeResponse =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: thirdNewEmail,
          password: memberPassword,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(thirdEmailChangeResponse);
  TestValidator.predicate(
    "third email change request should succeed",
    thirdEmailChangeResponse.success === true,
  );
  TestValidator.equals(
    "third verification email sent to correct address",
    thirdEmailChangeResponse.verification_email_sent_to,
    thirdNewEmail,
  );

  // Step 5: Verify that only the most recent token is valid
  // (The first and second tokens should be invalidated by subsequent requests)
  TestValidator.notEquals(
    "second token expiration differs from first",
    secondEmailChangeResponse.token_expires_at,
    firstEmailChangeResponse.token_expires_at,
  );
  TestValidator.notEquals(
    "third token expiration differs from second",
    thirdEmailChangeResponse.token_expires_at,
    secondEmailChangeResponse.token_expires_at,
  );
}
