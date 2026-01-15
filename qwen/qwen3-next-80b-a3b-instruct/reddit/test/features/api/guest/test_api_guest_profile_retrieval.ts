import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
export async function test_api_guest_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a complete guest profile with all fields
  const generatedGuest: ICommunityPlatformGuest =
    typia.random<ICommunityPlatformGuest>();
  typia.assert(generatedGuest);
  // Extract the guestId for the endpoint
  const guestId = generatedGuest.id;
  // Call the endpoint with the generated guestId
  const retrievedGuest: ICommunityPlatformGuest =
    await api.functional.communityPlatform.guests.at(connection, {
      guestId,
    });
  typia.assert(retrievedGuest);
  // Validate that the retrieved guest matches the generated guest's id
  TestValidator.equals(
    "retrieved guest ID matches requested guest ID",
    retrievedGuest.id,
    guestId,
  );
}
