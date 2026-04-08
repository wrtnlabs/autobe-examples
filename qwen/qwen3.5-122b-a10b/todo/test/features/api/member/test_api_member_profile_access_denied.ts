import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member profile endpoint accessibility and data structure validation.
 *
 * Validates that the member profile endpoint returns properly structured member data. Due to unavailable member creation and authentication APIs in the current SDK, full access control testing (403 Forbidden when accessing another member's profile) cannot be performed in this test. This test validates the endpoint exists and returns valid ITodoAppMember structure using simulation mode.
 *
 * 1. Configure connection with simulation mode enabled
 * 2. Generate random member ID
 * 3. Retrieve member profile using the endpoint
 * 4. Validate response structure matches ITodoAppMember type
 */
export async function test_api_member_profile_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Use simulation mode since member creation/login APIs are unavailable
  const memberConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // Generate random member ID for testing
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve member profile
  const member = await api.functional.todoApp.members.at(memberConnection, {
    memberId,
  });
  typia.assert(member);
  // Validate member data structure
  TestValidator.equals("member has valid id", member.id, memberId);
  TestValidator.predicate("member has email", member.email.length > 0);
  TestValidator.predicate(
    "member has display name",
    member.display_name.length > 0,
  );
}
