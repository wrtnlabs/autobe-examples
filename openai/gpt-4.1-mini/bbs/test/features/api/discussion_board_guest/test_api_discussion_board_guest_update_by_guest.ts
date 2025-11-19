import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_discussion_board_guest_update_by_guest(
  connection: api.IConnection,
) {
  // 1. Create a new guest user
  const initialNickname = RandomGenerator.name();
  const guestUser: IDiscussionBoardGuest =
    await api.functional.discussionBoard.discussionBoardGuests.create(
      connection,
      {
        body: {
          nickname: initialNickname,
        } satisfies IDiscussionBoardGuest.ICreate,
      },
    );
  typia.assert(guestUser);
  TestValidator.predicate(
    "created guest user nickname matches",
    guestUser.nickname === initialNickname,
  );

  // 2. Update the guest user's nickname
  const updatedNickname = RandomGenerator.name();
  const updatedGuestUser: IDiscussionBoardGuest =
    await api.functional.discussionBoard.discussionBoardGuests.update(
      connection,
      {
        discussionBoardGuestId: typia.assert<string & tags.Format<"uuid">>(
          guestUser.id,
        ),
        body: {
          nickname: updatedNickname,
        } satisfies IDiscussionBoardGuest.IUpdate,
      },
    );
  typia.assert(updatedGuestUser);

  // 3. Verify that the id remains unchanged
  TestValidator.equals(
    "guest user id remains unchanged after update",
    updatedGuestUser.id,
    guestUser.id,
  );

  // 4. Verify the nickname is updated
  TestValidator.equals(
    "guest user nickname is updated",
    updatedGuestUser.nickname,
    updatedNickname,
  );

  // 5. Verify created_at is unchanged
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedGuestUser.created_at,
    guestUser.created_at,
  );

  // 6. Verify updated_at timestamp is newer or equal
  TestValidator.predicate(
    "updated_at timestamp is updated",
    new Date(updatedGuestUser.updated_at) >= new Date(guestUser.updated_at),
  );

  // 7. Verify presence and type of deleted_at (should be null or undefined)
  TestValidator.predicate(
    "deleted_at is null or undefined",
    updatedGuestUser.deleted_at === null ||
      updatedGuestUser.deleted_at === undefined,
  );
}
