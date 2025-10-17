import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_tag_update_name_uniqueness_validation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for tag management privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create first tag with unique name
  const firstTagName = RandomGenerator.name(2);
  const firstTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: firstTagName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(firstTag);

  // Step 3: Create second tag with different unique name
  const secondTagName = RandomGenerator.name(2);
  const secondTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: secondTagName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(secondTag);

  // Step 4: Attempt to update first tag's name to match second tag's name (should fail)
  await TestValidator.error(
    "update should fail when attempting to create duplicate tag name",
    async () => {
      await api.functional.discussionBoard.administrator.tags.update(
        connection,
        {
          tagId: firstTag.id,
          body: {
            name: secondTag.name,
          } satisfies IDiscussionBoardTag.IUpdate,
        },
      );
    },
  );

  // Step 5: Verify system integrity by creating another tag
  // Note: Direct retrieval of original tags not possible due to API limitations (no GET endpoint)
  // This verification confirms the tag system remains functional after the failed update attempt
  const verificationTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(verificationTag);
}
