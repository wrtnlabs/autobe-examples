import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_discussion_board_guest_creation(
  connection: api.IConnection,
) {
  // Generate a realistic guest nickname
  const guestNickname = RandomGenerator.name(1);

  // Prepare the create request body with a valid nickname
  const createRequestBody = {
    nickname: guestNickname,
  } satisfies IDiscussionBoardGuest.ICreate;

  // Call the API to create a discussion board guest
  const guest: IDiscussionBoardGuest =
    await api.functional.discussionBoard.discussionBoardGuests.create(
      connection,
      {
        body: createRequestBody,
      },
    );

  // Validate the response type and structure
  typia.assert(guest);

  // Validate that the id is a valid UUID string (type guaranteed by typia.assert)
  // Validate that the nickname matches the requested one
  TestValidator.equals(
    "guest nickname matches requested",
    guest.nickname,
    guestNickname,
  );

  // Validate that created_at and updated_at are valid ISO date-time strings
  // typia.assert ensures format validation, so additional checks are redundant

  // Validate that deleted_at is null or undefined (guest is active)
  TestValidator.predicate(
    "guest deleted_at is null or undefined",
    guest.deleted_at === null || guest.deleted_at === undefined,
  );
}
