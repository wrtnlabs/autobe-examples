import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_reddit_community_content_type_update(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin to perform content type update
  const adminCreated: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminCreated);

  // 2. Create a content type to be updated
  const createdContentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: {
          content_type_code: `test_type_${RandomGenerator.alphaNumeric(6)}`,
          content_type_name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IRedditCommunityContentType.ICreate,
      },
    );
  typia.assert(createdContentType);

  // 3. Update the content type's name and description
  const updatedName = RandomGenerator.name(3);
  const updatedDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 7,
  });

  const updatedContentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.update(
      connection,
      {
        contentTypeCode: createdContentType.content_type_code,
        body: {
          content_type_name: updatedName,
          description: updatedDescription,
        } satisfies IRedditCommunityContentType.IUpdate,
      },
    );
  typia.assert(updatedContentType);

  // 4. Validate the update succeeded
  TestValidator.equals(
    "content_type_code remains same",
    updatedContentType.content_type_code,
    createdContentType.content_type_code,
  );
  TestValidator.equals(
    "content_type_name updated",
    updatedContentType.content_type_name,
    updatedName,
  );

  if (
    updatedContentType.description === null ||
    updatedContentType.description === undefined
  ) {
    TestValidator.equals(
      "description updated to null",
      updatedContentType.description,
      null,
    );
  } else {
    TestValidator.equals(
      "description updated",
      updatedContentType.description,
      updatedDescription,
    );
  }
}
