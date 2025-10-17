import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";

export async function test_api_member_profile_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new member through registration
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IMemberCreate.IRequest;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: registrationBody,
  });
  typia.assert(memberAuth);

  // Step 2: Retrieve the current member profile
  const currentProfile = await api.functional.todo.member.members.at(
    connection,
    {
      memberId: memberAuth.id,
    },
  );
  typia.assert(currentProfile);

  // Step 3: Prepare updated profile data with email change
  const emailUpdateBody = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies ITodoMember.IUpdate;

  // Step 4: Update member email
  const updatedProfile = await api.functional.todo.member.members.update(
    connection,
    {
      memberId: memberAuth.id,
      body: emailUpdateBody,
    },
  );
  typia.assert(updatedProfile);

  // Step 5: Validate email update was successful
  TestValidator.equals(
    "email update successful",
    updatedProfile.email,
    emailUpdateBody.email,
  );
  TestValidator.equals(
    "member ID unchanged",
    updatedProfile.id,
    currentProfile.id,
  );
  TestValidator.predicate(
    "updated timestamp changed",
    updatedProfile.updated_at > currentProfile.updated_at,
  );

  // Step 6: Verify the updated profile is reflected in subsequent retrieval
  const retrievedProfile = await api.functional.todo.member.members.at(
    connection,
    {
      memberId: memberAuth.id,
    },
  );
  typia.assert(retrievedProfile);

  // Step 7: Validate profile changes persist correctly
  TestValidator.equals(
    "retrieved email matches update",
    retrievedProfile.email,
    emailUpdateBody.email,
  );
  TestValidator.equals(
    "retrieved profile equals updated profile",
    retrievedProfile.id,
    updatedProfile.id,
  );

  // Step 8: Test role update (if member has permission)
  const roleUpdateBody = {
    role: RandomGenerator.pick(["member", "admin"] as const),
  } satisfies ITodoMember.IUpdate;

  const roleUpdatedProfile = await api.functional.todo.member.members.update(
    connection,
    {
      memberId: memberAuth.id,
      body: roleUpdateBody,
    },
  );
  typia.assert(roleUpdatedProfile);

  // Step 9: Validate role update
  TestValidator.equals(
    "role update successful",
    roleUpdatedProfile.role,
    roleUpdateBody.role,
  );
  TestValidator.predicate(
    "role change affects profile",
    updatedProfile.role !== roleUpdatedProfile.role,
  );

  // Step 10: Test partial update (only some fields)
  const partialUpdateBody = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies ITodoMember.IUpdate;

  const partialUpdatedProfile = await api.functional.todo.member.members.update(
    connection,
    {
      memberId: memberAuth.id,
      body: partialUpdateBody,
    },
  );
  typia.assert(partialUpdatedProfile);

  // Step 11: Validate partial update maintains existing fields
  TestValidator.equals(
    "partial email update works",
    partialUpdatedProfile.email,
    partialUpdateBody.email,
  );
  TestValidator.equals(
    "other fields preserved in partial update",
    partialUpdatedProfile.role,
    roleUpdatedProfile.role,
  );
}
