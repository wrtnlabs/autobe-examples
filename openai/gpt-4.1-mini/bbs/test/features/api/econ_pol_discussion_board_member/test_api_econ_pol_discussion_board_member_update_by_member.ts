import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

export async function test_api_econ_pol_discussion_board_member_update_by_member(
  connection: api.IConnection,
) {
  // 1. Create a new member account
  const username = RandomGenerator.alphabets(8);
  const email = `${username}@example.com` satisfies string &
    tags.Format<"email">;
  const initialPassword = RandomGenerator.alphabets(12);
  const memberCreateBody = {
    username: username,
    password: initialPassword,
    email: email,
  } satisfies IEconPolDiscussionBoardMember.ICreate;

  const createdMember: IEconPolDiscussionBoardMember =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardMembers.create(
      connection,
      {
        body: memberCreateBody,
      },
    );
  typia.assert(createdMember);
  TestValidator.equals(
    "created member username matches",
    createdMember.username,
    username,
  );
  TestValidator.equals(
    "created member email matches",
    createdMember.email,
    email,
  );

  // 2. Update the member's password and email
  const updatedPassword = RandomGenerator.alphabets(14);
  const updatedEmail = `updated_${username}@example.com` satisfies string &
    tags.Format<"email">;
  const memberUpdateBody = {
    password: updatedPassword,
    email: updatedEmail,
  } satisfies IEconPolDiscussionBoardMember.IUpdate;

  const updatedMember: IEconPolDiscussionBoardMember =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardMembers.update(
      connection,
      {
        memberUsername: username,
        body: memberUpdateBody,
      },
    );
  typia.assert(updatedMember);

  // The username must remain immutable
  TestValidator.equals(
    "username remains unchanged after update",
    updatedMember.username,
    username,
  );

  // The email should be updated
  TestValidator.equals("email is updated", updatedMember.email, updatedEmail);

  // The created_at should be unchanged
  TestValidator.equals(
    "created_at remains unchanged",
    updatedMember.created_at,
    createdMember.created_at,
  );

  // The updated_at should be different (later than created_at)
  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(updatedMember.updated_at) > new Date(updatedMember.created_at),
  );

  // The deleted_at should be null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    updatedMember.deleted_at === null || updatedMember.deleted_at === undefined,
  );

  // 3. Attempt to update with an email that duplicates the existing member's email
  // First, create another member to have a conflicting email
  const anotherUsername = RandomGenerator.alphabets(8);
  const conflictingEmail = `${anotherUsername}@example.com` satisfies string &
    tags.Format<"email">;
  const anotherMemberCreateBody = {
    username: anotherUsername,
    password: RandomGenerator.alphabets(12),
    email: conflictingEmail,
  } satisfies IEconPolDiscussionBoardMember.ICreate;

  const anotherCreatedMember: IEconPolDiscussionBoardMember =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardMembers.create(
      connection,
      {
        body: anotherMemberCreateBody,
      },
    );
  typia.assert(anotherCreatedMember);

  // Now try to update the first member's email to the conflicting email
  const conflictUpdateBody = {
    password: RandomGenerator.alphabets(14),
    email: conflictingEmail, // Intentionally conflict with existing member
  } satisfies IEconPolDiscussionBoardMember.IUpdate;

  await TestValidator.error(
    "updating to duplicate email should fail",
    async () => {
      await api.functional.econPolDiscussionBoard.econPolDiscussionBoardMembers.update(
        connection,
        {
          memberUsername: username,
          body: conflictUpdateBody,
        },
      );
    },
  );
}
