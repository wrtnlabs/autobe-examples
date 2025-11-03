import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_reddit_community_content_types_erase(
  connection: api.IConnection,
) {
  // 1. Admin user registration and login
  const adminUser: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      },
    });
  typia.assert(adminUser);

  // 2. Create a new content type to be deleted
  const uniqueContentTypeCode = `testcode_${RandomGenerator.alphabets(8)}`;
  const contentTypeCreateBody = {
    content_type_code: uniqueContentTypeCode,
    content_type_name: `Test Content Type ${RandomGenerator.alphabets(4)}`,
    description: `Automatically generated test content type for deletion`,
  } satisfies IRedditCommunityContentType.ICreate;

  const createdContentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: contentTypeCreateBody,
      },
    );
  typia.assert(createdContentType);
  TestValidator.equals(
    "created content type code matches requested",
    createdContentType.content_type_code,
    contentTypeCreateBody.content_type_code,
  );

  // 3. Delete the newly created content type
  await api.functional.redditCommunity.admin.redditCommunityContentTypes.erase(
    connection,
    {
      contentTypeCode: createdContentType.content_type_code,
    },
  );

  // 4. Verify deletion: Try to delete again should fail with error
  await TestValidator.error(
    "deleting already deleted content type should fail",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunityContentTypes.erase(
        connection,
        {
          contentTypeCode: createdContentType.content_type_code,
        },
      );
    },
  );
}
