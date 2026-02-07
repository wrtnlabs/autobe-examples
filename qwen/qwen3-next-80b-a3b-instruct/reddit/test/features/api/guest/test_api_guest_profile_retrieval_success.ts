import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid guest ID
  const guestId = typia.random<string & tags.Format<"uuid">>();
  // Create actor-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Call the API endpoint to retrieve guest profile
  const guestProfile = await api.functional.community.guests.at(
    guestConnection,
    { guestId },
  );
  typia.assert(guestProfile);
  // Validate that response is a valid ICommunityCommunity (empty object)
  TestValidator.predicate(
    "guest profile is object",
    typeof guestProfile === "object",
  );
  TestValidator.predicate("guest profile is not null", guestProfile !== null);
  TestValidator.equals(
    "guest profile has no properties",
    Object.keys(guestProfile).length,
    0,
  );
}
