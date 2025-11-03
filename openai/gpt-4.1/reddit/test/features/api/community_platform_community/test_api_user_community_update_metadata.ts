import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test updating the name and description of an existing community by a user.
 *
 * - Authenticate as a new user via /auth/user/join.
 * - Admin creates a community to serve as update target.
 * - As the new user, update the created community's name and description with
 *   valid, unique values.
 * - Validate the API response reflects the change and all business rules (name
 *   uniqueness, character set, length, etc) are enforced.
 * - Attempt update with illegal values and expect validation errors (duplicate
 *   name, too short/long, forbidden chars).
 */
export async function test_api_user_community_update_metadata(
  connection: api.IConnection,
) {
  // Step 1: User registration (authenticate as a new user)
  const uniqueEmail: string = `${RandomGenerator.alphaNumeric(10)}@e2etest.com`;
  const userJoin = {
    email: uniqueEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    href: `https://${RandomGenerator.alphaNumeric(12)}.e2etest.com/join`,
    referrer: `https://${RandomGenerator.alphaNumeric(8)}.e2etest.com`,
  } satisfies ICommunityPlatformUser.IJoin;
  const joined: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(joined);

  // Step 2: Admin creates two communities: target and duplicate-check
  const adminCommunityBody = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      { body: adminCommunityBody },
    );
  typia.assert(community);

  const duplicateName = RandomGenerator.alphaNumeric(12).toLowerCase();
  const adminCommunityBody2 = {
    name: duplicateName,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const anotherCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      { body: adminCommunityBody2 },
    );
  typia.assert(anotherCommunity);

  // Step 3: As user, update community name/description with valid unique values
  // New update values
  const updateName = RandomGenerator.alphaNumeric(15).toLowerCase();
  const updateDescription = RandomGenerator.paragraph({ sentences: 6 });
  const updateBody = {
    name: updateName,
    description: updateDescription,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updated: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.update(connection, {
      communityId: community.id,
      body: updateBody,
    });
  typia.assert(updated);
  TestValidator.equals(
    "updated community name reflects change",
    updated.name,
    updateName,
  );
  TestValidator.equals(
    "updated community description reflects change",
    updated.description,
    updateDescription,
  );

  // Step 4: Attempt to update community with duplicate name (should fail)
  const dupeBody = {
    name: duplicateName,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunity.IUpdate;
  await TestValidator.error(
    "update with duplicate name is rejected",
    async () => {
      await api.functional.communityPlatform.user.communities.update(
        connection,
        {
          communityId: community.id,
          body: dupeBody,
        },
      );
    },
  );

  // Step 5: Attempt to update to invalid (too short name)
  const shortNameBody = {
    name: "ab",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunity.IUpdate;
  await TestValidator.error(
    "update with too short name is rejected",
    async () => {
      await api.functional.communityPlatform.user.communities.update(
        connection,
        {
          communityId: community.id,
          body: shortNameBody,
        },
      );
    },
  );

  // Step 6: Attempt to update to invalid (forbidden characters in name)
  const forbiddenNameBody = {
    name: "invalid name!$@",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunity.IUpdate;
  await TestValidator.error(
    "update with forbidden characters in name is rejected",
    async () => {
      await api.functional.communityPlatform.user.communities.update(
        connection,
        {
          communityId: community.id,
          body: forbiddenNameBody,
        },
      );
    },
  );

  // Step 7: Attempt to update to too long description
  const longDescription = RandomGenerator.paragraph({ sentences: 300 }); // >250 chars
  const longDescriptionBody = {
    name: RandomGenerator.alphaNumeric(12),
    description: longDescription,
  } satisfies ICommunityPlatformCommunity.IUpdate;
  await TestValidator.error(
    "update with too long description is rejected",
    async () => {
      await api.functional.communityPlatform.user.communities.update(
        connection,
        {
          communityId: community.id,
          body: longDescriptionBody,
        },
      );
    },
  );
}
