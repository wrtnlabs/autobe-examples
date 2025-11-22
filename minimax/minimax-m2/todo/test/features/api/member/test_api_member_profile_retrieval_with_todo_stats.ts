import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

export async function test_api_member_profile_retrieval_with_todo_stats(
  connection: api.IConnection,
) {
  // Step 1: Register a new member to establish authenticated session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Retrieve member profile using the registered member ID
  const profile: ITodoAppMember.IInvert =
    await api.functional.todoApp.member.members.profile.at(connection, {
      memberId: member.id,
    });
  typia.assert(profile);

  // Step 3: Validate profile data matches the registered member information
  TestValidator.equals("member ID should match", profile.id, member.id);
  TestValidator.equals("email should match", profile.email, member.email);
  TestValidator.equals(
    "first name should match",
    profile.first_name,
    member.first_name,
  );
  TestValidator.equals(
    "last name should match",
    profile.last_name,
    member.last_name,
  );
  TestValidator.equals("status should be active", profile.status, "active");

  // Step 4: Validate profile structure and required fields
  TestValidator.predicate(
    "profile should have valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profile.id,
    ),
  );
  TestValidator.predicate(
    "profile should have valid email format",
    /^[^@]+@[^@]+\.[^@]+$/.test(profile.email),
  );
  TestValidator.predicate(
    "profile should have creation timestamp",
    profile.created_at !== undefined && profile.created_at !== null,
  );
  TestValidator.predicate(
    "profile should have update timestamp",
    profile.updated_at !== undefined && profile.updated_at !== null,
  );

  // Step 5: Validate soft deletion timestamp (should be null for active member)
  TestValidator.equals(
    "deleted_at should be null for active member",
    profile.deleted_at,
    null,
  );

  // Step 6: Additional validation for complete profile structure
  if (profile.first_name !== undefined) {
    TestValidator.predicate(
      "first name should be non-empty string",
      typeof profile.first_name === "string" && profile.first_name.length > 0,
    );
  }
  if (profile.last_name !== undefined) {
    TestValidator.predicate(
      "last name should be non-empty string",
      typeof profile.last_name === "string" && profile.last_name.length > 0,
    );
  }
}
