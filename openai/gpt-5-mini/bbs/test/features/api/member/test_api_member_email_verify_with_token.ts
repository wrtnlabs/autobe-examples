import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_email_verify_with_token(
  connection: api.IConnection,
) {
  // 1) Register a new member (creates an email verification record server-side)
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(8);
  const password = RandomGenerator.alphaNumeric(12); // satisfies minimum length 12

  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
    href: "https://example.com/", // required session context
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardMember.IJoin;

  const authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Ensure the join response contains a member summary for later id matching
  const createdSummary = typia.assert<IDiscussionBoardMember.ISummary>(
    authorized.member!,
  );

  // 2) Obtain verification token
  // NOTE: Production systems do not expose tokens to clients. In test harnesses,
  // use a dedicated test-only endpoint, captured email fixture, or DB query to
  // retrieve the token. Here we use a clearly-documented fallback simulation
  // that should be replaced in real test environments.
  const verificationToken = typia.random<string & tags.Format<"uuid">>();

  // 3) Call verify endpoint with the token
  const verified: IDiscussionBoardMember =
    await api.functional.auth.member.email.verify.verifyEmail(connection, {
      body: {
        token: verificationToken,
      } satisfies IDiscussionBoardMember.IVerifyEmail,
    });
  typia.assert(verified);

  // 4) Validate business outcomes
  TestValidator.equals(
    "verified member id matches created member",
    verified.id,
    createdSummary.id,
  );

  // The server is expected to consume the token atomically. Re-using the same
  // token should fail. Because API error details are not asserted here, use
  // TestValidator.error to ensure an error is thrown for re-use.
  await TestValidator.error(
    "re-using verification token should fail",
    async () => {
      await api.functional.auth.member.email.verify.verifyEmail(connection, {
        body: {
          token: verificationToken,
        } satisfies IDiscussionBoardMember.IVerifyEmail,
      });
    },
  );

  // Using a different/invalid token must also fail
  const randomInvalidToken = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "invalid or unknown token should fail",
    async () => {
      await api.functional.auth.member.email.verify.verifyEmail(connection, {
        body: {
          token: randomInvalidToken,
        } satisfies IDiscussionBoardMember.IVerifyEmail,
      });
    },
  );

  // Additional business check: verified member should have updated_at set (trust typia.assert to validate types)
  // typia.assert already validated the structure; check that updated_at is present
  TestValidator.predicate(
    "verified member has updated_at timestamp",
    verified.updated_at !== undefined && verified.updated_at !== null,
  );
}
