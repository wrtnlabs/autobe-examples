import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSProfile";

export async function test_api_profile_retrieval_invalid_id(
  connection: api.IConnection,
) {
  // Step 1: Create a new citizen account to establish authentication context
  const citizenEmail: string = typia.random<string & tags.Format<"email">>();
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: citizenEmail satisfies ICommunityBBSCitizenICreate,
    });
  typia.assert(citizen);

  // Step 2: Verify that retrieving a profile with an invalid ID returns 404 Not Found
  // Use a random UUID that is guaranteed to not exist as a profile ID
  const invalidProfileId: string = typia.random<string & tags.Format<"uuid">>();

  // The system should return a 404 error when trying to retrieve a non-existent profile
  // This verifies security practices prevent profile enumeration
  await TestValidator.error(
    "retrieving invalid profile ID should return 404 Not Found",
    async () => {
      await api.functional.communityBBS.profiles.at(connection, {
        profileId: invalidProfileId,
      });
    },
  );
}
