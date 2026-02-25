import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_administrator_comments_listing_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join with valid test data
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // 2. Administrator login with same credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoggedIn = await authorize_administrator_login(
    adminLoginConnection,
    {
      body: {
        email: adminJoinBody.email,
        password: adminJoinBody.password,
        href: "http://localhost/login",
        referrer: "http://localhost/referrer",
        ip: null,
      },
    },
  );
  typia.assert(adminLoggedIn);
  // Set Authorization header for adminLoginConnection for subsequent calls
  adminLoginConnection.headers = {
    Authorization: adminLoggedIn.token.access,
  };
  // 3. Registered user join
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(userAuth);
  // 4. Registered user creates an article
  const userArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(userArticle);
  // 5. Fetch comment list without filters (page 1, limit 10) as admin
  const requestBody: IDiscussionBoardComment.IRequest = {
    page: 1,
    limit: 10,
  };
  // 6. Access control: verify error when no auth
  await TestValidator.error(
    "unauthorized access without admin auth",
    async () => {
      await api.functional.discussionBoard.administrator.comments.index(
        connection,
        {
          body: requestBody,
        },
      );
    },
  );
  // 7. Retrieve comments with admin auth
  const commentsPage =
    await api.functional.discussionBoard.administrator.comments.index(
      adminLoginConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(commentsPage);
  // 8. Validate pagination info
  TestValidator.equals(
    "pagination current",
    commentsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", commentsPage.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    commentsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    commentsPage.pagination.pages >= 0,
  );
  // 9. Validate each comment
  for (const comment of commentsPage.data) {
    typia.assert(comment);
    // Validate author display name
    TestValidator.predicate(
      "author displayName non-empty",
      typeof comment.author.displayName === "string" &&
        comment.author.displayName.length > 0,
    );
    // Validate comment content is non-empty string
    TestValidator.predicate(
      "comment content non-empty",
      typeof comment.content === "string" && comment.content.length > 0,
    );
    // Validate timestamps
    TestValidator.predicate(
      "createdAt is ISO string",
      typeof comment.createdAt === "string" && comment.createdAt.length > 0,
    );
    TestValidator.predicate(
      "updatedAt is ISO string",
      typeof comment.updatedAt === "string" && comment.updatedAt.length > 0,
    );
    // deletedAt can be null or ISO string
    TestValidator.predicate(
      "deletedAt null or ISO",
      comment.deletedAt === null ||
        (typeof comment.deletedAt === "string" && comment.deletedAt.length > 0),
    );
    // Validate comments relate to article by the user
    TestValidator.equals(
      "comment author email",
      comment.author.email,
      userAuth.email,
    );
  }
}
