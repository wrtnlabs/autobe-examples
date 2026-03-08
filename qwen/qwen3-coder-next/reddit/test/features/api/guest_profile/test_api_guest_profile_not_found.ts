import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the database
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent guest - this should return a 404 error
  await TestValidator.error("guest profile not found", async () => {
    await api.functional.redditLike.guests.at(connection, {
      guestId: nonExistentGuestId,
    });
  });
}
