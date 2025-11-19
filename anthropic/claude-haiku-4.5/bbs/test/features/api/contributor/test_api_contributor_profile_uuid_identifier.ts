import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_contributor_profile_uuid_identifier(
  connection: api.IConnection,
) {
  // Step 1: Create a contributor account to generate a UUID identifier
  const createContributorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<50> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    password: "SecurePassword123!@#",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardContributor.ICreate;

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: createContributorBody,
    });
  typia.assert(contributor);

  // Step 2: Verify the contributor id is a valid UUID v4 format
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "contributor id should be valid UUID v4 format",
    uuidV4Regex.test(contributor.id),
  );

  // Step 3: Retrieve the profile and verify it contains the same UUID identifier
  const profileResponse: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.at(connection);
  typia.assert(profileResponse);

  // Step 4: Verify the profile id matches the created contributor id
  TestValidator.equals(
    "profile id should match contributor id",
    profileResponse.id,
    contributor.id,
  );

  // Step 5: Verify profile id is also a valid UUID v4 format
  TestValidator.predicate(
    "profile id should be valid UUID v4 format",
    uuidV4Regex.test(profileResponse.id),
  );

  // Step 6: Retrieve profile again and verify UUID consistency
  const profileResponse2: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.at(connection);
  typia.assert(profileResponse2);

  // Step 7: Verify the second retrieval has the same UUID identifier
  TestValidator.equals(
    "profile id should remain consistent across multiple retrievals",
    profileResponse2.id,
    contributor.id,
  );

  // Step 8: Verify second retrieval also has valid UUID v4 format
  TestValidator.predicate(
    "second profile retrieval id should be valid UUID v4 format",
    uuidV4Regex.test(profileResponse2.id),
  );
}
