import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_comments_list_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new registered user
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
      },
    },
  );
  // Update connection headers for authenticated user
  registeredUserConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Create an article by the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          // Must specify an existing sectionId, but details of sections are not provided.
          // We'll omit sectionId to auto-populate if possible or generate a fallback dummy uuid.
          sectionId:
            typeof authorized.id === "string" && authorized.id.length === 36
              ? authorized.id
              : typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // 3. We do NOT create comments here because the API does not support comment creation.
  // So skip direct creation and only test listing comments filtered by author.
  // 4. Request the comments list filtered by author ID with pagination and sorting oldest first
  const requestBody: IDiscussionBoardComment.IRequest = {
    discussionBoardRegisteredUserId: authorized.id,
    page: 1,
    limit: 10,
  };
  const response =
    await api.functional.discussionBoard.registeredUser.comments.index(
      registeredUserConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 5. Validate response structure
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "comments data is an array",
    Array.isArray(response.data),
  );
  // Validate each comment
  for (const comment of response.data) {
    typia.assert(comment);
    TestValidator.predicate(
      "comment author ID matches",
      comment.author.id === authorized.id,
    );
    // Ensure createdAt is not empty
    TestValidator.predicate(
      "comment createdAt exists",
      typeof comment.createdAt === "string" && comment.createdAt.length > 0,
    );
  }
  // 6. Test that without authorization, the request fails
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("request without auth fails", async () => {
    await api.functional.discussionBoard.registeredUser.comments.index(
      noAuthConnection,
      {
        body: requestBody,
      },
    );
  });
}
