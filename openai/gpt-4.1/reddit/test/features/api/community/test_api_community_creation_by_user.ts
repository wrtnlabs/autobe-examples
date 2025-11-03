import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test successful creation of a new community by a registered user.
 *
 * This test validates the workflow for successful community creation:
 *
 * 1. A user registers with a unique email and display name.
 * 2. The same user creates a new community with a unique, valid name (3-50
 *    alphanumeric/underscore, lower-case) and a description (1-250 chars).
 * 3. The test validates that the new community's creator_user_id matches the
 *    current logged-in user, community properties match input, and all
 *    date/timestamp fields are present and correctly formatted.
 * 4. The test also ensures business rules for the name and description are
 *    strictly enforced (format, length, uniqueness).
 * 5. An error is expected when trying to create another community with the same
 *    name, confirming uniqueness enforcement.
 */
export async function test_api_community_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user (join)
  const userJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://community.wrtn.dev/register",
    referrer: "https://community.wrtn.dev/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuth: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoin });
  typia.assert(userAuth);

  // 2. Create a new community (with valid name & description)
  const uniqueCommunityName = RandomGenerator.alphabets(10).toLowerCase();
  const communityCreate = {
    name: uniqueCommunityName satisfies string,
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(createdCommunity);

  // 3. Validate community record matches input and audit fields
  TestValidator.equals(
    "community name matches input",
    createdCommunity.name,
    communityCreate.name,
  );
  TestValidator.equals(
    "community description matches input",
    createdCommunity.description,
    communityCreate.description,
  );
  TestValidator.equals(
    "community creator_user_id matches current user",
    createdCommunity.creator_user_id,
    userAuth.id,
  );
  TestValidator.predicate(
    "community timestamps exist and are valid ISO8601",
    typeof createdCommunity.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
        createdCommunity.created_at,
      ) &&
      typeof createdCommunity.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
        createdCommunity.updated_at,
      ),
  );
  TestValidator.equals(
    "community is active/deleted_at null or undefined",
    createdCommunity.deleted_at,
    null,
  );

  // 4. Attempt to create another community with the same name (should fail uniqueness rule)
  const duplicateCommunity = {
    name: communityCreate.name,
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  await TestValidator.error(
    "duplicate community name is rejected",
    async () => {
      await api.functional.communityPlatform.user.communities.create(
        connection,
        { body: duplicateCommunity },
      );
    },
  );

  // 5. Try to create with invalid values (optional extra: name too short, invalid chars, description too long)
  const invalidNameCommunity = {
    name: "!n$", // invalid due to length < 3 and forbidden chars
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  await TestValidator.error(
    "community name format validation: too short and invalid chars",
    async () => {
      await api.functional.communityPlatform.user.communities.create(
        connection,
        { body: invalidNameCommunity },
      );
    },
  );

  const longDescription = RandomGenerator.paragraph({
    sentences: 60,
    wordMin: 5,
    wordMax: 10,
  });
  const invalidDescCommunity = {
    name: RandomGenerator.alphabets(8).toLowerCase(),
    description: longDescription,
  } satisfies ICommunityPlatformCommunity.ICreate;
  await TestValidator.error(
    "community description format validation: too long (>250 chars)",
    async () => {
      await api.functional.communityPlatform.user.communities.create(
        connection,
        { body: invalidDescCommunity },
      );
    },
  );
}
