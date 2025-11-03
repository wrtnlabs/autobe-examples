import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_guest_public_retrieval(
  connection: api.IConnection,
) {
  // 1) Prepare a guest creation request
  const displayName = RandomGenerator.name();
  const ip = "127.0.0.1"; // realistic IPv4 for test
  const requestBody = {
    displayName,
    ip,
    href: "https://example.com/current-page",
    referrer: "https://example.com/previous-page",
  } satisfies IDiscussionBoardGuest.ICreate;

  // 2) Create a transient guest account (join)
  const created: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });
  typia.assert(created);

  // Basic sanity checks on the authorized response
  TestValidator.predicate(
    "join returned id",
    created.id !== undefined && created.id !== null,
  );
  TestValidator.equals(
    "join returned same displayName",
    created.displayName ?? null,
    displayName ?? null,
  );

  // 3) Public GET retrieval by guestId
  const read: IDiscussionBoardGuest =
    await api.functional.discussionBoard.guests.at(connection, {
      guestId: created.id,
    });
  typia.assert(read);

  // 4) Validate business expectations
  TestValidator.equals(
    "public retrieval: id matches created id",
    read.id,
    created.id,
  );
  TestValidator.equals(
    "public retrieval: displayName preserved",
    read.displayName ?? null,
    created.displayName ?? null,
  );

  // IP may be considered PII and redacted for public callers. If the API returns
  // the IP (not redacted), it should match the value supplied during join.
  // Use predicate to allow either null (redacted) or matching value.
  TestValidator.predicate(
    "public retrieval: ip either redacted or matches created value",
    read.ip === null ||
      read.ip === undefined ||
      read.ip === created.ip ||
      read.ip === ip,
  );

  // 5) Ensure timestamps exist. typia.assert already validates formats; assert they are present.
  TestValidator.predicate(
    "createdAt exists",
    read.createdAt !== null &&
      read.createdAt !== undefined &&
      read.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt exists",
    read.updatedAt !== null &&
      read.updatedAt !== undefined &&
      read.updatedAt.length > 0,
  );

  // 6) Negative case: non-existent guest should throw an error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Avoid accidental collision
  if (nonExistentId === created.id) {
    // Extremely unlikely, but regenerate if collided
    const another = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.error("non-existent guest should error", async () => {
      await api.functional.discussionBoard.guests.at(connection, {
        guestId: another,
      });
    });
  } else {
    await TestValidator.error("non-existent guest should error", async () => {
      await api.functional.discussionBoard.guests.at(connection, {
        guestId: nonExistentId,
      });
    });
  }
}
