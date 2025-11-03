import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test website URL format validation during moderator profile updates.
 *
 * This test ensures that moderator profile website URLs are properly validated
 * for correct HTTP/HTTPS format. It verifies that invalid URL formats are
 * rejected while valid HTTP and HTTPS URLs are accepted, maintaining data
 * quality for external website references in moderator profiles.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Attempt updates with invalid URL formats (missing protocol, wrong protocol,
 *    malformed)
 * 3. Verify that invalid formats are rejected
 * 4. Update with valid HTTP URL and verify acceptance
 * 5. Update with valid HTTPS URL and verify acceptance
 * 6. Confirm final profile contains the valid HTTPS URL
 */
export async function test_api_moderator_profile_update_website_url_format(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
    href: "https://testsite.com/register",
    referrer: "https://testsite.com/home",
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorized = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(authorized);

  const moderatorUsername = authorized.username;

  // Step 2: Test invalid URL format - missing protocol
  await TestValidator.error(
    "website URL without protocol should fail validation",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.update(
        connection,
        {
          moderatorUsername: moderatorUsername,
          body: {
            website_url: "example.com/mysite",
          } satisfies IDiscussionBoardModerator.IUpdate,
        },
      );
    },
  );

  // Step 3: Test invalid URL format - wrong protocol (not HTTP/HTTPS)
  await TestValidator.error(
    "website URL with ftp protocol should fail validation",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.update(
        connection,
        {
          moderatorUsername: moderatorUsername,
          body: {
            website_url: "ftp://files.example.com",
          } satisfies IDiscussionBoardModerator.IUpdate,
        },
      );
    },
  );

  // Step 4: Test malformed URL
  await TestValidator.error(
    "malformed website URL should fail validation",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.update(
        connection,
        {
          moderatorUsername: moderatorUsername,
          body: {
            website_url: "ht!tp://invalid url with spaces",
          } satisfies IDiscussionBoardModerator.IUpdate,
        },
      );
    },
  );

  // Step 5: Update with valid HTTP URL - should succeed
  const validHttpUrl = "http://example.com/moderator-profile";
  const updatedWithHttp =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorUsername: moderatorUsername,
        body: {
          website_url: validHttpUrl,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedWithHttp);
  TestValidator.equals(
    "profile updated with valid HTTP URL",
    updatedWithHttp.website_url,
    validHttpUrl,
  );

  // Step 6: Update with valid HTTPS URL - should succeed
  const validHttpsUrl = "https://secure.example.com/my-moderator-page";
  const updatedWithHttps =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorUsername: moderatorUsername,
        body: {
          website_url: validHttpsUrl,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedWithHttps);
  TestValidator.equals(
    "profile updated with valid HTTPS URL",
    updatedWithHttps.website_url,
    validHttpsUrl,
  );

  // Step 7: Verify final profile contains the valid HTTPS URL
  TestValidator.predicate(
    "final website URL matches the last valid HTTPS update",
    updatedWithHttps.website_url === validHttpsUrl,
  );
}
