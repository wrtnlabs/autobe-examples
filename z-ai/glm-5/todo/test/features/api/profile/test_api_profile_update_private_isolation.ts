import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that profile updates are completely private and isolated between members.
 *
 * This test validates the privacy requirement that each member's profile
 * is completely private and isolated from other members. Each member can
 * only see and modify their own profile data.
 *
 * Test Flow:
 * 1. Create Member A account with initial display name
 * 2. Create Member B account with different display name
 * 3. Member A updates display name to "Member A Updated"
 * 4. Verify Member A's profile shows their updated name
 * 5. Member B updates display name to "Member B Updated"
 * 6. Verify Member B's profile shows their own updated name (not Member A's)
 * 7. Member A updates again to verify their profile is unchanged by Member B
 * 8. Validate complete isolation: each member only affects their own profile
 */
export async function test_api_profile_update_private_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Member A account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      displayName: "Member A Original",
    },
  });
  typia.assert(memberA);
  // Step 2: Create Member B account (completely separate user)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      displayName: "Member B Original",
    },
  });
  typia.assert(memberB);
  // Verify members have different IDs and emails
  TestValidator.notEquals("Members have different IDs", memberA.id, memberB.id);
  TestValidator.notEquals(
    "Members have different emails",
    memberA.email,
    memberB.email,
  );
  // Step 3: Member A updates their display name
  const memberAUpdated = await api.functional.todoApp.member.profile.update(
    memberAConnection,
    {
      body: {
        displayName: "Member A Updated",
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(memberAUpdated);
  // Step 4: Verify Member A's profile shows their updated display name
  TestValidator.equals(
    "Member A display name updated",
    memberAUpdated.displayName,
    "Member A Updated",
  );
  TestValidator.equals("Member A ID unchanged", memberAUpdated.id, memberA.id);
  TestValidator.equals(
    "Member A email unchanged",
    memberAUpdated.email,
    memberA.email,
  );
  // Step 5: Member B updates their display name (separate connection)
  const memberBUpdated = await api.functional.todoApp.member.profile.update(
    memberBConnection,
    {
      body: {
        displayName: "Member B Updated",
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(memberBUpdated);
  // Step 6: Verify Member B's profile shows their own updated display name
  // NOT Member A's updated name - proving isolation
  TestValidator.equals(
    "Member B display name updated",
    memberBUpdated.displayName,
    "Member B Updated",
  );
  TestValidator.equals("Member B ID unchanged", memberBUpdated.id, memberB.id);
  TestValidator.equals(
    "Member B email unchanged",
    memberBUpdated.email,
    memberB.email,
  );
  // Step 7: Member A updates again to verify their profile
  // was NOT affected by Member B's update
  const memberAFinal = await api.functional.todoApp.member.profile.update(
    memberAConnection,
    {
      body: {
        displayName: "Member A Final",
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(memberAFinal);
  // Step 8: Validate complete isolation - Member A's profile unchanged by Member B
  TestValidator.equals(
    "Member A ID still unchanged after Member B update",
    memberAFinal.id,
    memberA.id,
  );
  TestValidator.equals(
    "Member A email still unchanged after Member B update",
    memberAFinal.email,
    memberA.email,
  );
  TestValidator.equals(
    "Member A can update independently",
    memberAFinal.displayName,
    "Member A Final",
  );
  // Additional isolation validation: ensure Member B's data is completely separate
  TestValidator.predicate(
    "Member B ID differs from Member A",
    memberB.id !== memberA.id,
  );
  TestValidator.predicate(
    "Member B email differs from Member A",
    memberB.email !== memberA.email,
  );
}
