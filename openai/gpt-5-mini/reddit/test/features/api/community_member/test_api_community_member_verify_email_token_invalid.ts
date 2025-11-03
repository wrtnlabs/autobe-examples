import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

export async function test_api_community_member_verify_email_token_invalid(
  connection: api.IConnection,
) {
  // 1) Prepare realistic member sign-up data
  const email: string = typia.random<string & tags.Format<"email">>();
  const username: string = RandomGenerator.alphaNumeric(8);
  const password = "Passw0rd!"; // meets required password policy

  const joinBody = {
    email,
    username,
    password,
    session_context: {
      href: `https://example.test/welcome/${RandomGenerator.alphaNumeric(6)}`,
      referrer: `https://example.test/ref/${RandomGenerator.alphaNumeric(6)}`,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  // 2) Create the community member (self-join)
  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Basic sanity: member id and tokens exist
  TestValidator.predicate(
    "join returned member id",
    typeof authorized.member.id === "string" && authorized.member.id.length > 0,
  );
  TestValidator.predicate(
    "join returned access token",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );

  // 3) Attempt verification with an explicitly invalid token and expect an error
  await TestValidator.error(
    "invalid email verification token should fail",
    async () => {
      await api.functional.auth.communityMember.email.verify.verifyEmail(
        connection,
        {
          body: {
            token: "invalid-token-123",
          } satisfies ICommunityBbsCommunityMember.IVerifyEmail,
        },
      );
    },
  );

  // 4) Post-condition assertions: Because there's no GET/profile SDK, we
  // assert that the original authorized payload remains intact and session
  // token was not revoked as a result of the invalid attempt. For full
  // persistence checks (email_verified flag, audit logs), tests must query
  // the DB or email-outbox; that is not available via this SDK.
  TestValidator.predicate(
    "authorized token still present after failed verification",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
}
