import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_tags_create } from "../../../generate/generate_random_discussion_board_tags_create";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

/**
 * Test authorization failure when a registered user who is not the author nor administrator tries to update an article tag mapping.
 *
 * Steps:
 * 1. Create an author user, join and get authorized connection
 * 2. Create a tag by author user
 * 3. Create an article and assign a tag mapping by author user (assumed API for this)
 * 4. Create a different registered user as non-author, join and get connection
 * 5. Attempt to update the existing tag mapping with non-author user connection
 * 6. Confirm that API returns an authorization failure error
 * 7. Confirm that the tag mapping has not changed in database by fetching it
 * 8. Optionally, create an admin user connection and prove they can update
 *
 * Note: Since creating articles and tag mappings is out of scope for provided API,
 * the test focuses on authorization failure check and tag visibility.
 *
 */
export async function test_api_discussion_board_article_tag_mapping_update_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Author user join and authorize
  const authorUserConnection: api.IConnection = { host: connection.host };
  const authorUser = await authorize_registered_user_join(
    authorUserConnection,
    {
      body: {}, // IJoin has no defined properties
    },
  );
  typia.assert(authorUser);
  authorUserConnection.headers = authorUserConnection.headers ?? {};
  authorUserConnection.headers.Authorization = `Bearer ${authorUser.token.access}`;
  // 2. Create a tag by author user
  const originalTag = await generate_random_discussion_board_tags_create(
    authorUserConnection,
    {
      body: {},
    },
  );
  typia.assert(originalTag);
  // 3. Create an article and assign a tag mapping by author user
  // Note: Creation of article and tag mapping is not provided by API, so we simulate
  // For this test, we explicitly create a tag mapping object to test authorization
  // We'll use the originalTag.id and generate fake UUIDs for articleId and tagMappingId
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const tagMappingId = typia.random<string & tags.Format<"uuid">>();
  // The update body to change tag mapping
  const updateBody: IDiscussionBoardArticleTagMapping.IUpdate = {
    // We assume updateable fields exist, but schema is empty, so send empty object
  };
  // 4. Create a different registered user as non-author
  const nonAuthorUserConnection: api.IConnection = { host: connection.host };
  const nonAuthorUser = await authorize_registered_user_join(
    nonAuthorUserConnection,
    {
      body: {},
    },
  );
  typia.assert(nonAuthorUser);
  nonAuthorUserConnection.headers = nonAuthorUserConnection.headers ?? {};
  nonAuthorUserConnection.headers.Authorization = `Bearer ${nonAuthorUser.token.access}`;
  // 5. Attempt to update article tag mapping with non-author user
  await TestValidator.httpError(
    "Update tag mapping by non-author should fail authorization",
    403,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.updateArticleTagMapping(
        nonAuthorUserConnection,
        {
          articleId: articleId,
          tagMappingId: tagMappingId,
          body: updateBody,
        },
      );
    },
  );
  // 6. The tag mapping is not changed (assuming we can fetch it, but no fetch API provided)
  // We can't fetch the tag mapping in current API, so this limitation exists.
  // This step is acknowledged but cannot be implemented due to missing API.
  // So we just note it as a comment.
  // await TestValidator.equals("tag mapping unchanged", originalTag, await fetchTagMapping());
  // 7. (Optional) Admin user can update - skipped as no admin utilities provided
}
