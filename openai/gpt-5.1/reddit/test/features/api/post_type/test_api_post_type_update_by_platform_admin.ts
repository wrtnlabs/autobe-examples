import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_post_type_update_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and start an authenticated session
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an initial post type configuration as this platform admin
  const initialPostTypeBody = {
    code: `code_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const createdPostType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: initialPostTypeBody,
      },
    );
  typia.assert(createdPostType);

  // Keep baseline immutable fields and previous updated_at
  const originalId = createdPostType.id;
  const originalCode = createdPostType.code;
  const originalCreatedAt = createdPostType.created_at;
  const originalUpdatedAt = createdPostType.updated_at;

  // 3. Update the post type's name and description while preserving code
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
  } satisfies ICommunityPlatformPostType.IUpdate;

  const updatedPostType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.update(
      connection,
      {
        postTypeId: createdPostType.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPostType);

  // 4. Validate that immutable fields are preserved and mutable fields are updated
  TestValidator.equals(
    "post type id must be preserved after update",
    updatedPostType.id,
    originalId,
  );

  TestValidator.equals(
    "post type code must remain unchanged after name/description update",
    updatedPostType.code,
    originalCode,
  );

  TestValidator.equals(
    "created_at timestamp must remain unchanged after update",
    updatedPostType.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "name field must be updated to new value",
    updatedPostType.name,
    updatedName,
  );

  TestValidator.equals(
    "description field must be updated to new value",
    updatedPostType.description,
    updatedDescription,
  );

  // 5. Validate updated_at semantics: it should change after update
  TestValidator.notEquals(
    "updated_at timestamp should be changed after update",
    updatedPostType.updated_at,
    originalUpdatedAt,
  );
}
