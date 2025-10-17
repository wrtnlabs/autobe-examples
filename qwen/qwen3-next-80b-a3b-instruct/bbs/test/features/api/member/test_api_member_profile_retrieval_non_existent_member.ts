import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";

export async function test_api_member_profile_retrieval_non_existent_member(
  connection: api.IConnection,
) {
  // Authenticate as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Create a member to establish system context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: RandomGenerator.alphaNumeric(60),
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Generate a truly non-existent member ID
  const nonExistentMemberId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt to retrieve a non-existent member ID
  await TestValidator.error(
    "should return 404 for non-existent member ID",
    async () => {
      await api.functional.economicBoard.admin.members.at(connection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
