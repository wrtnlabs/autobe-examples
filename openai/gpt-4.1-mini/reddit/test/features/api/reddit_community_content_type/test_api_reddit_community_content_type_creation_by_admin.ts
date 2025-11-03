import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_reddit_community_content_type_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1. Admin sign up with user_id
  // Since user_id is required, generate a valid UUID
  // For testing, generate random UUID string

  // Create admin user
  const adminUser: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminUser);

  // Step 2. Create unique content type
  const uniqueCode = `code_${RandomGenerator.alphaNumeric(10)}`;
  const uniqueName = `ContentType ${RandomGenerator.name(2)}`;
  const description = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const createdContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: {
          content_type_code: uniqueCode,
          content_type_name: uniqueName,
          description: description,
        } satisfies IRedditCommunityContentType.ICreate,
      },
    );
  typia.assert(createdContentType);
  TestValidator.equals(
    "created content_type_code matches input",
    createdContentType.content_type_code,
    uniqueCode,
  );
  TestValidator.equals(
    "created content_type_name matches input",
    createdContentType.content_type_name,
    uniqueName,
  );
  TestValidator.equals(
    "created description matches input",
    createdContentType.description,
    description,
  );

  // Step 3. Attempt to create duplicate content_type_code, expect error
  await TestValidator.error(
    "duplicate content_type_code creation should fail",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
        connection,
        {
          body: {
            content_type_code: uniqueCode,
            content_type_name: `Another ${uniqueName}`,
            description: null,
          } satisfies IRedditCommunityContentType.ICreate,
        },
      );
    },
  );
}
