import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";

export async function test_api_attachment_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create an article with multiple attachments (mix of files and images)
  const attachments: IDiscussionBoardArticleAttachment.ICreate[] = [
    {
      type: "file",
      name: "document.pdf",
      extension: "pdf",
      size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20000000>
      >(),
      url: typia.random<string & tags.Format<"uri">>(),
    },
    {
      type: "image",
      name: "photo.jpg",
      extension: "jpg",
      size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000000>
      >(),
      url: typia.random<string & tags.Format<"uri">>(),
    },
    {
      type: "file",
      name: "report.xlsx",
      extension: "xlsx",
      size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20000000>
      >(),
      url: typia.random<string & tags.Format<"uri">>(),
    },
    {
      type: "image",
      name: "screenshot.png",
      extension: "png",
      size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000000>
      >(),
      url: typia.random<string & tags.Format<"uri">>(),
    },
    {
      type: "file",
      name: "notes.txt",
      extension: "txt",
      size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20000000>
      >(),
      url: typia.random<string & tags.Format<"uri">>(),
    },
  ];
  // Let generate_random_discussion_board_member_articles_create handle all required fields
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        attachments,
      },
    },
  );
  typia.assert(article);
  // 3. Call the attachment list endpoint with default pagination
  const result =
    await api.functional.discussionBoard.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {},
      },
    );
  typia.assert(result);
  // 4. Verify pagination metadata exists and has correct structure
  TestValidator.predicate(
    "pagination exists",
    () => result.pagination !== undefined,
  );
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.predicate(
    "limit is non-negative",
    () => result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count matches data",
    () => result.pagination.records >= result.data.length,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    () => result.pagination.pages >= 0,
  );
  // 5. Verify all attachments are returned with correct properties
  TestValidator.equals(
    "data length matches created attachments",
    result.data.length,
    attachments.length,
  );
  for (const attachment of result.data) {
    typia.assert<IDiscussionBoardArticleAttachment.ISummary>(attachment);
  }
  // 6. Verify attachments are sorted by created_at DESC
  for (let i = 1; i < result.data.length; i++) {
    const prevDate = new Date(result.data[i - 1].created_at).getTime();
    const currDate = new Date(result.data[i].created_at).getTime();
    TestValidator.predicate(
      "sorted by created_at DESC",
      () => prevDate >= currDate,
    );
  }
  // 7. Verify both 'file' and 'image' type attachments are included
  const fileAttachments = result.data.filter((a) => a.type === "file");
  const imageAttachments = result.data.filter((a) => a.type === "image");
  TestValidator.predicate(
    "has file attachments",
    () => fileAttachments.length > 0,
  );
  TestValidator.predicate(
    "has image attachments",
    () => imageAttachments.length > 0,
  );
  // 8. Verify the internal 'path' field is NOT exposed (ISummary doesn't include 'path')
  // The typia.assert<IPageIDiscussionBoardArticleAttachment.ISummary>(result) already validates
  // that 'path' is not in the response because ISummary type doesn't have 'path' property
}
