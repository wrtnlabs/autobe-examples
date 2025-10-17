import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";

export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
) {
  // Authenticate member to establish authorization context
  const email: string = typia.random<string & tags.Format<"email">>();
  const passwordHash: string = RandomGenerator.alphaNumeric(60);

  const authorized: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(authorized);

  // Retrieve the authenticated member's profile
  const profile: IEconomicBoardMember =
    await api.functional.economicBoard.member.me.at(connection);
  typia.assert(profile);

  // Validate that profile contains expected fields and excludes sensitive ones
  TestValidator.equals(
    "member email matches authenticated email",
    profile.email,
    email,
  );
  TestValidator.predicate("member is active", profile.is_active === true);

  // Verify verified_at is undefined (email not verified in this test)
  TestValidator.equals(
    "verified_at should be undefined",
    profile.verified_at,
    undefined,
  );
}
