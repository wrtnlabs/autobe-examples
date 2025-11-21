import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSCitizenKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenKarma";

export async function test_api_citizen_karma_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new citizen account using the join endpoint
  // The schema defines ICommunityBBSCitizenICreate as a string that represents a JSON object
  // Extracted from the documentation: requires email, username, password, and possibly bio/userPicture
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: "SecurePass123!", // Meeting complexity requirements
  };

  const joinResponse = await api.functional.auth.citizen.join(connection, {
    body: JSON.stringify(joinBody),
  });
  typia.assert(joinResponse);

  // Step 2: Extract the citizen ID from the join response for use in karma retrieval
  const citizenId = joinResponse.id;

  // Step 3: Retrieve the citizen's karma score using the citizen ID
  const karmaResponse =
    await api.functional.communityBBS.citizen.citizens.karma.at(connection, {
      citizenId,
    });
  typia.assert(karmaResponse);

  // Step 4: Validate that the karma score matches the expected initial value (typically 0 for a newly registered user)
  TestValidator.equals(
    "newly created citizen has initial karma of 0",
    karmaResponse,
    0,
  );
}
