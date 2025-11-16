import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate community settings can be publicly retrieved immediately after
 * community creation.
 *
 * 1. Register a new user (for authentication)
 * 2. Create a community with unique slug, title, description, visibility, and
 *    status
 * 3. Retrieve settings with community slug from public endpoint
 * 4. Check that settings are correctly linked to created community
 *    (community_platform_community_id, etc)
 * 5. Check all major configuration fields (posting, submission_type, default_sort,
 *    appearance_theme, etc) are present
 * 6. Edge case: attempt to retrieve settings for a non-existent communityName
 *    (expect error)
 */
export async function test_api_community_settings_public_access_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a new user for authentication context
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = typia.random<string & tags.Format<"password">>();
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);
  TestValidator.equals(
    "user registration email matches input",
    user.email,
    email,
  );

  // 2. Create a community as newly joined user
  const communityName: string = RandomGenerator.alphaNumeric(12);
  const createBody = {
    name: communityName as string & tags.MinLength<3> & tags.MaxLength<30>,
    display_title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 10,
    }) as string & tags.MinLength<1> & tags.MaxLength<100>,
    description: RandomGenerator.content({ paragraphs: 2 }),
    visibility: RandomGenerator.pick([
      "public",
      "private",
      "invite-only",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "archived",
      "banned",
      "pending approval",
    ] as const),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: createBody,
    });
  typia.assert(community);
  TestValidator.equals(
    "community name (slug) matches",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community display_title matches",
    community.display_title,
    createBody.display_title,
  );
  TestValidator.equals(
    "community description matches",
    community.description,
    createBody.description,
  );
  TestValidator.equals(
    "community status matches",
    community.status,
    createBody.status,
  );
  TestValidator.equals(
    "community visibility matches",
    community.visibility,
    createBody.visibility,
  );

  // 3. Retrieve community settings by slug (public endpoint)
  const settings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.at(connection, {
      communityName: community.name,
    });
  typia.assert(settings);
  // Validate direct linkage
  TestValidator.equals(
    "settings.community_platform_community_id matches community.id",
    settings.community_platform_community_id,
    community.id,
  );
  // Validate major fields exist and types
  TestValidator.predicate(
    "settings.allow_posting is boolean",
    typeof settings.allow_posting === "boolean",
  );
  TestValidator.predicate(
    "settings.submission_type is string",
    typeof settings.submission_type === "string",
  );
  TestValidator.predicate(
    "settings.default_sort is string",
    typeof settings.default_sort === "string",
  );
  // Optional: appearance_theme can be null or string
  TestValidator.predicate(
    "settings.appearance_theme nullable string",
    settings.appearance_theme === null ||
      typeof settings.appearance_theme === "string" ||
      settings.appearance_theme === undefined,
  );

  // 4. Edge: try fetching settings for non-existent slug
  await TestValidator.error(
    "should throw error for non-existent communityName",
    async () => {
      await api.functional.communityPlatform.communities.settings.at(
        connection,
        {
          communityName:
            "notarealcommunityslug_" + RandomGenerator.alphaNumeric(10),
        },
      );
    },
  );
}
