import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_post_type_detail_reflects_soft_deleted_entries(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const adminJoinBody = {
    username: `${RandomGenerator.name(1)}_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert(adminAuthorized);

  // 2. Create a new post type configuration
  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const createdPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdPostType);

  // 2-1. Verify that the created post type can be retrieved via detail endpoint before deletion
  const fetchedBeforeDelete =
    await api.functional.communityPlatform.platformAdmin.postTypes.at(
      connection,
      {
        postTypeId: createdPostType.id,
      },
    );
  typia.assert(fetchedBeforeDelete);
  TestValidator.equals(
    "created and fetched post type ids should match before deletion",
    fetchedBeforeDelete.id,
    createdPostType.id,
  );
  TestValidator.equals(
    "created and fetched post type codes should match before deletion",
    fetchedBeforeDelete.code,
    createdPostType.code,
  );
  TestValidator.equals(
    "created and fetched post type names should match before deletion",
    fetchedBeforeDelete.name,
    createdPostType.name,
  );
  TestValidator.equals(
    "created and fetched post type descriptions should match before deletion",
    fetchedBeforeDelete.description,
    createdPostType.description,
  );

  // 3. Delete (erase) the created post type
  await api.functional.communityPlatform.platformAdmin.postTypes.erase(
    connection,
    {
      postTypeId: createdPostType.id,
    },
  );

  // 4. After deletion, attempting to fetch the same post type detail must result in an error
  await TestValidator.error(
    "post type detail lookup should fail after deletion",
    async () => {
      await api.functional.communityPlatform.platformAdmin.postTypes.at(
        connection,
        {
          postTypeId: createdPostType.id,
        },
      );
    },
  );
}
