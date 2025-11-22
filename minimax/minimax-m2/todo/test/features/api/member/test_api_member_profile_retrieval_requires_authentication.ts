import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

export async function test_api_member_profile_retrieval_requires_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a test member account to obtain authentication credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const registeredMember: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: testEmail,
        first_name: "Test",
        last_name: "Member",
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(registeredMember);

  // Step 2: Test unauthorized access - create connection without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Verify that unauthorized access is rejected
  await TestValidator.error(
    "unauthorized access to member profile should be rejected",
    async () => {
      await api.functional.todoApp.member.members.at(
        unauthenticatedConnection,
        {
          memberId: registeredMember.id,
        },
      );
    },
  );

  // Step 3: Test authorized access using the authenticated connection
  const memberProfile: ITodoAppMember =
    await api.functional.todoApp.member.members.at(connection, {
      memberId: registeredMember.id,
    });
  typia.assert(memberProfile);

  // Verify the returned profile matches the registered member data
  TestValidator.equals(
    "member profile data integrity after authentication",
    memberProfile.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "member email matches registration",
    memberProfile.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "member name matches registration",
    memberProfile.first_name,
    registeredMember.first_name,
  );
}
