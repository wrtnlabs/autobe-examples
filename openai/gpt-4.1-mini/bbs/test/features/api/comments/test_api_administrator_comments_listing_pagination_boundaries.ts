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

export async function test_api_administrator_comments_listing_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin and user connections
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminPassword = "AdminPass123!";
  const admin = await authorize_administrator_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    },
  });
  typia.assert(admin);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
      href: "http://localhost/admin",
      referrer: "http://localhost/admin",
    },
  });
  // 2. Prepare registered user and article for comments association
  const registeredUserJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const registeredUserPassword = "UserPass123!";
  const registeredUser = await authorize_registered_user_join(
    registeredUserJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: registeredUserPassword,
      },
    },
  );
  typia.assert(registeredUser);
  const registeredUserConnection: api.IConnection = { host: connection.host };
  await authorize_registered_user_login(registeredUserConnection, {
    body: {
      email: registeredUser.email,
      password: registeredUserPassword,
    },
  });
  // 3. Create an article as the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      {},
    );
  typia.assert(article);
  // 4. Fetch first page with default limit
  const firstPageRequest: IDiscussionBoardComment.IRequest = {
    page: 1,
    limit: 10,
  };
  let pagingResult =
    await api.functional.discussionBoard.administrator.comments.index(
      adminConnection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(pagingResult);
  // 5. Test pagination boundary: last page calculation
  const totalRecords = pagingResult.pagination.records;
  const limit = pagingResult.pagination.limit;
  const expectedPages = pagingResult.pagination.pages;
  // Request the last page if pages exist
  if (expectedPages >= 1) {
    const lastPageRequest: IDiscussionBoardComment.IRequest = {
      page: expectedPages,
      limit,
    };
    pagingResult =
      await api.functional.discussionBoard.administrator.comments.index(
        adminConnection,
        { body: lastPageRequest },
      );
    typia.assert(pagingResult);
    TestValidator.predicate(
      "last page current equals expectedPages",
      pagingResult.pagination.current === expectedPages,
    );
    TestValidator.equals(
      "last page limit equals expected limit",
      pagingResult.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "last page records greater or equal to 0",
      pagingResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      "last page data count less than or equal to limit",
      pagingResult.data.length <= limit,
    );
  }
  // 6. Request beyond last page, expecting empty results but valid pagination
  if (expectedPages >= 1) {
    const beyondLastPageRequest: IDiscussionBoardComment.IRequest = {
      page: expectedPages + 1,
      limit,
    };
    pagingResult =
      await api.functional.discussionBoard.administrator.comments.index(
        adminConnection,
        {
          body: beyondLastPageRequest,
        },
      );
    typia.assert(pagingResult);
    TestValidator.equals(
      "beyond last page current equals expectedPages + 1",
      pagingResult.pagination.current,
      expectedPages + 1,
    );
    TestValidator.equals(
      "beyond last page limit equals expected limit",
      pagingResult.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "beyond last page records equals totalRecords",
      pagingResult.pagination.records,
      totalRecords,
    );
    TestValidator.predicate(
      "beyond last page pages equals expectedPages",
      pagingResult.pagination.pages === expectedPages,
    );
    TestValidator.equals(
      "beyond last page data count is zero",
      pagingResult.data.length,
      0,
    );
  }
  // 7. Ensure administrator authentication is enforced
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated call to comments index should throw",
    async () => {
      await api.functional.discussionBoard.administrator.comments.index(
        anonymousConnection,
        { body: firstPageRequest },
      );
    },
  );
}
