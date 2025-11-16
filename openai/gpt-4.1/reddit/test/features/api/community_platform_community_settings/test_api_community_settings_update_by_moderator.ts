import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Verifies that an authenticated moderator can update the settings for an
 * existing community, and that only authorized moderators can perform this
 * action. Also checks business logic, required fields and correct application
 * of changes.
 *
 * 1. Register a new regular user
 * 2. User creates a new community
 * 3. Register a new moderator
 * 4. Moderator logs in
 * 5. Moderator updates the settings of the created community (all basic fields)
 * 6. Confirms all changes are reflected in the returned settings
 * 7. Attempts the update as an unauthenticated user and as other regular users,
 *    expecting failures
 */
export async function test_api_community_settings_update_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const userReg = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userReg);

  // 2. User creates a new community
  const communityCreate = {
    name: RandomGenerator.alphaNumeric(10) as string &
      tags.MinLength<3> &
      tags.MaxLength<30>,
    display_title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
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
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Save community name for updates
  const communityName = community.name;

  // 3. Register a new moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(13) as string &
    tags.Format<"password">;
  const moderatorReg = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      status: "active",
      href: "https://moderator.join/",
      referrer: "https://referrer.com/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderatorReg);

  // 4. Moderator logs in
  const moderatorLogin = await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://moderator.login/",
      referrer: "https://referrer.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  typia.assert(moderatorLogin);

  // 5. Moderator updates community settings
  const updateFields = {
    allow_posting: RandomGenerator.pick([true, false] as const),
    submission_type: RandomGenerator.pick([
      "text",
      "link",
      "image",
      "mixed",
    ] as const),
    default_sort: RandomGenerator.pick(["hot", "new", "top"] as const),
    appearance_theme: RandomGenerator.pick([
      "light",
      "dark",
      "blue",
      "green",
      null,
    ] as const),
  } satisfies ICommunityPlatformCommunitySettings.IUpdate;
  const updated =
    await api.functional.communityPlatform.moderator.communities.settings.update(
      connection,
      {
        communityName,
        body: updateFields,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "allow_posting was updated",
    updated.allow_posting,
    updateFields.allow_posting,
  );
  TestValidator.equals(
    "submission_type was updated",
    updated.submission_type,
    updateFields.submission_type,
  );
  TestValidator.equals(
    "default_sort was updated",
    updated.default_sort,
    updateFields.default_sort,
  );
  TestValidator.equals(
    "appearance_theme was updated",
    updated.appearance_theme,
    updateFields.appearance_theme ?? null,
  );

  // 6. Attempt the update unauthenticated (new connection with empty headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update community settings",
    async () => {
      await api.functional.communityPlatform.moderator.communities.settings.update(
        unauthConnection,
        {
          communityName,
          body: updateFields,
        },
      );
    },
  );

  // 7. Attempt the update as a regular user (not moderator)
  // Login as the original user using their valid password
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://user.login/",
      referrer: "https://referrer.com/",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  await TestValidator.error(
    "regular user cannot update community settings",
    async () => {
      await api.functional.communityPlatform.moderator.communities.settings.update(
        connection,
        {
          communityName,
          body: updateFields,
        },
      );
    },
  );
}
