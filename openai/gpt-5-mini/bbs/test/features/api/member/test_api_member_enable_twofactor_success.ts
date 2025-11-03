import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_enable_twofactor_success(
  connection: api.IConnection,
) {
  // 1. Register a new member to obtain an authenticated session
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    // Construct a password that meets the "minimum 12 characters and multiple categories" rule
    password:
      RandomGenerator.alphaNumeric(8) + "Aa!" + RandomGenerator.alphaNumeric(3),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. Initiate MFA enrollment (TOTP) for the authenticated member
  const enableBody = {
    method: "totp",
    return_qr_svg: true,
  } satisfies IDiscussionBoardMember.IEnableTwoFactor;

  const memberAfter: IDiscussionBoardMember =
    await api.functional.auth.member.mfa.enable.enableTwoFactor(connection, {
      body: enableBody,
    });
  typia.assert(memberAfter);

  // 3. Business validations
  TestValidator.equals(
    "mfa_enabled should be true after enabling",
    memberAfter.mfa_enabled,
    true,
  );

  TestValidator.predicate(
    "updated_at should be same or after created_at",
    new Date(memberAfter.updated_at).getTime() >=
      new Date(memberAfter.created_at).getTime(),
  );
}
