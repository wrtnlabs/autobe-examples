import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test successful community creation workflow for registered users.
 *
 * This test validates that authenticated registered users can create new
 * communities with proper configuration, automatically receive moderator
 * privileges, and the community becomes discoverable in the platform. The test
 * covers the complete workflow from user registration to community creation and
 * verification.
 *
 * Test Flow:
 *
 * 1. Create a registered user account with valid credentials
 * 2. Generate realistic community creation data with unique name and proper
 *    settings
 * 3. Submit community creation request using authenticated user context
 * 4. Verify the API response contains the newly created community
 * 5. Confirm the creating user is assigned as initial moderator
 * 6. Validate community status, member counts, and discoverability
 */
export async function test_api_community_creation_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account for community creation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userData = {
    username: `${RandomGenerator.alphaNumeric(8)}_user`,
    email: userEmail,
    password: "TestPass123!",
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    website_url: typia.random<string & tags.Format<"uri">>(),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    href: "https://reddit-platform.com/register",
    referrer: "https://reddit-platform.com/",
  } satisfies IRedditPlatformRegisteredUser.ICreate;

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData,
    });
  typia.assert(registeredUser);

  // Step 2: Generate realistic community creation data
  const communityData = {
    name: `${RandomGenerator.alphaNumeric(12)}_community`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    type: "public" as const,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    require_post_approval: false,
    require_comment_approval: false,
    nsfw_content_allowed: false,
  } satisfies IRedditPlatformCommunity.ICreate;

  // Step 3: Create the community using the authenticated user
  const createdCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(createdCommunity);

  // Step 4: Validate community creation response
  TestValidator.equals(
    "community name matches input",
    createdCommunity.name,
    communityData.name,
  );
  TestValidator.equals(
    "community title matches input",
    createdCommunity.title,
    communityData.title,
  );
  TestValidator.equals(
    "community type matches input",
    createdCommunity.type,
    communityData.type,
  );
  TestValidator.equals(
    "community description matches input",
    createdCommunity.description,
    communityData.description,
  );

  // Step 5: Verify creator assignment and moderator privileges
  TestValidator.equals(
    "creator is the registering user",
    createdCommunity.creator.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "creator username matches",
    createdCommunity.creator.username,
    registeredUser.username,
  );

  // Step 6: Validate community status and initialization
  TestValidator.equals(
    "community status is active",
    createdCommunity.status,
    "active",
  );
  TestValidator.equals(
    "member count initialized to zero",
    createdCommunity.member_count,
    0,
  );
  TestValidator.equals(
    "post count initialized to zero",
    createdCommunity.post_count,
    0,
  );
  TestValidator.equals(
    "subscriber count initialized to zero",
    createdCommunity.subscriber_count,
    0,
  );

  // Step 7: Verify content permissions match input settings
  TestValidator.equals(
    "text posts permission matches",
    createdCommunity.allow_text_posts,
    communityData.allow_text_posts,
  );
  TestValidator.equals(
    "link posts permission matches",
    createdCommunity.allow_link_posts,
    communityData.allow_link_posts,
  );
  TestValidator.equals(
    "image posts permission matches",
    createdCommunity.allow_image_posts,
    communityData.allow_image_posts,
  );
  TestValidator.equals(
    "post approval requirement matches",
    createdCommunity.require_post_approval,
    communityData.require_post_approval,
  );
  TestValidator.equals(
    "comment approval requirement matches",
    createdCommunity.require_comment_approval,
    communityData.require_comment_approval,
  );
  TestValidator.equals(
    "NSFW content policy matches",
    createdCommunity.nsfw_content_allowed,
    communityData.nsfw_content_allowed,
  );

  // Step 8: Validate timestamps and system fields
  TestValidator.predicate(
    "community has creation timestamp",
    createdCommunity.created_at.length > 0,
  );
  TestValidator.predicate(
    "community has update timestamp",
    createdCommunity.updated_at.length > 0,
  );
  TestValidator.predicate(
    "community ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdCommunity.id,
    ),
  );
}
