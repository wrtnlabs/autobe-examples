import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_post_type_detail_retrieval_by_platform_admin(
  connection: api.IConnection,
) {
  /**
   * Validate that a platform administrator can retrieve detailed information
   * for an existing post type by its UUID id.
   *
   * Business flow:
   *
   * 1. Register and authenticate a platform admin using /auth/platformAdmin/join.
   * 2. As the authenticated admin, create a new post type via POST
   *    /communityPlatform/platformAdmin/postTypes.
   * 3. Retrieve the post type details via GET
   *    /communityPlatform/platformAdmin/postTypes/{postTypeId}.
   * 4. Verify that the response matches the created entity and that deleted_at is
   *    null (active type).
   */

  // 1. Register and authenticate a platform admin
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new post type as this platform admin
  const postTypeCreateBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const createdPostType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(createdPostType);

  // 3. Retrieve the post type by id using the detail endpoint
  const reloadedPostType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.at(
      connection,
      {
        postTypeId: createdPostType.id,
      },
    );
  typia.assert(reloadedPostType);

  // 4. Validate that retrieved post type matches created one
  TestValidator.equals(
    "post type id should match between creation and retrieval",
    reloadedPostType.id,
    createdPostType.id,
  );

  TestValidator.equals(
    "post type code should match between creation and retrieval",
    reloadedPostType.code,
    postTypeCreateBody.code,
  );

  TestValidator.equals(
    "post type name should match between creation and retrieval",
    reloadedPostType.name,
    postTypeCreateBody.name,
  );

  TestValidator.equals(
    "post type description should match between creation and retrieval",
    reloadedPostType.description,
    postTypeCreateBody.description,
  );

  TestValidator.equals(
    "deleted_at should be null for an active post type",
    reloadedPostType.deleted_at ?? null,
    null,
  );
}
