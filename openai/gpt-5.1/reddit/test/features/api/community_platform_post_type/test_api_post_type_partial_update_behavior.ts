import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_post_type_partial_update_behavior(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that updating a post type with a partial IUpdate payload only
   * mutates specified fields and preserves omitted ones, while keeping
   * system-managed identifiers stable and bumping updated_at.
   *
   * Scenario:
   *
   * 1. Register and authenticate a platform admin using POST
   *    /auth/platformAdmin/join.
   * 2. Create a new post type via POST /communityPlatform/platformAdmin/postTypes
   *    with all mutable fields populated (code, name, description).
   * 3. Perform a partial update via PUT
   *    /communityPlatform/platformAdmin/postTypes/{postTypeId} providing only a
   *    new description in ICommunityPlatformPostType.IUpdate.
   * 4. Assert that:
   *
   *    - Id is unchanged.
   *    - Code and name remain exactly as originally created.
   *    - Description is updated to the new value.
   *    - Created_at is unchanged.
   *    - Updated_at has changed compared to the original.
   */
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://console.example.com/admin/register",
    referrer: "https://console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  const initialCode: string = `code_${RandomGenerator.alphaNumeric(8)}`;
  const initialName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const initialDescription: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const created: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: initialCode,
          name: initialName,
          description: initialDescription,
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostType>(created);

  const newDescription: string = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 6,
    wordMin: 3,
    wordMax: 8,
  });

  const updated: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.update(
      connection,
      {
        postTypeId: created.id,
        body: {
          description: newDescription,
        } satisfies ICommunityPlatformPostType.IUpdate,
      },
    );
  typia.assert<ICommunityPlatformPostType>(updated);

  TestValidator.equals(
    "id remains stable after partial update",
    updated.id,
    created.id,
  );

  TestValidator.equals(
    "code preserved when omitted from IUpdate",
    updated.code,
    created.code,
  );

  TestValidator.equals(
    "name preserved when omitted from IUpdate",
    updated.name,
    created.name,
  );

  TestValidator.notEquals(
    "description changed after partial update",
    updated.description,
    created.description,
  );

  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    created.created_at,
  );

  TestValidator.notEquals(
    "updated_at is bumped after partial update",
    updated.updated_at,
    created.updated_at,
  );

  TestValidator.equals(
    "deleted_at remains consistent after update",
    updated.deleted_at ?? null,
    created.deleted_at ?? null,
  );
}
