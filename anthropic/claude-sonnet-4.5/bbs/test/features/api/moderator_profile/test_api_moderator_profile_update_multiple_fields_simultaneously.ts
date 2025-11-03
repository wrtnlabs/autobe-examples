import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderators can update multiple profile fields in a single
 * operation.
 *
 * This test validates the atomic multi-field update capability of the moderator
 * profile endpoint. It creates a moderator account, then updates all five
 * optional profile fields (display_name, bio, location, website_url,
 * profile_picture_url) in a single PUT request and verifies all changes are
 * applied correctly.
 *
 * Steps:
 *
 * 1. Create and authenticate a new moderator account via join endpoint
 * 2. Prepare update data with all optional profile fields modified
 * 3. Execute PUT request to update all fields simultaneously
 * 4. Validate response contains all updated values matching the request
 * 5. Verify transactional consistency of the multi-field update
 */
export async function test_api_moderator_profile_update_multiple_fields_simultaneously(
  connection: api.IConnection,
) {
  const joinRequestBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorizedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorizedModerator);

  const updateRequestBody = {
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 10, wordMin: 4, wordMax: 8 }),
    location: RandomGenerator.name(3),
    website_url: typia.random<string & tags.Format<"uri">>(),
    profile_picture_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.IUpdate;

  const updatedModerator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorUsername: authorizedModerator.username,
        body: updateRequestBody,
      },
    );
  typia.assert(updatedModerator);

  TestValidator.equals(
    "display_name matches updated value",
    updatedModerator.display_name,
    updateRequestBody.display_name,
  );
  TestValidator.equals(
    "bio matches updated value",
    updatedModerator.bio,
    updateRequestBody.bio,
  );
  TestValidator.equals(
    "location matches updated value",
    updatedModerator.location,
    updateRequestBody.location,
  );
  TestValidator.equals(
    "website_url matches updated value",
    updatedModerator.website_url,
    updateRequestBody.website_url,
  );
  TestValidator.equals(
    "profile_picture_url matches updated value",
    updatedModerator.profile_picture_url,
    updateRequestBody.profile_picture_url,
  );
}
