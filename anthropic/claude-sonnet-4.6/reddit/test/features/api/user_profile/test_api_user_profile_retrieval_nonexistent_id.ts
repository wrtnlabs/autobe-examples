import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_retrieval_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest connection (no authorization header)
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID that does not correspond to any existing profile
  const nonExistentProfileId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent profile; expect 404 Not Found
  await TestValidator.httpError(
    "retrieving non-existent user profile should return 404",
    404,
    async () => {
      await api.functional.community.userProfiles.at(guestConnection, {
        userProfileId: nonExistentProfileId,
      });
    },
  );
}
