import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentThumbnail";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentThumbnail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_admin_thumbnail_search_by_attachment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a discussion board section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 4. Create an article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Upload multiple image attachments to the article
  const attachments: IDiscussionBoardAttachment[] = [];
  const imageTypes = ["jpg", "png", "gif"] as const;
  for (const filetype of imageTypes) {
    const attachment =
      await generate_random_discussion_board_member_articles_attachments_create(
        memberConnection,
        {
          params: { articleId: article.id },
          body: {
            filename: `image.${filetype}`,
            filetype,
            mime_type:
              { jpg: "image/jpeg", png: "image/png", gif: "image/gif" }[
                filetype
              ] ?? "image/jpeg",
            size_bytes: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1000> &
                tags.Maximum<5000000>
            >(),
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    attachments.push(attachment);
  }
  // 6. Search thumbnails filtered by specific attachment ID
  const targetAttachment = attachments[0];
  const otherAttachment = attachments[1];
  const searchResult =
    await api.functional.discussionBoard.admin.thumbnails.index(
      adminConnection,
      {
        body: {
          attachment_id: targetAttachment.id,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(searchResult);
  // 7. Validate search results contain only thumbnails for the targeted attachment
  if (searchResult.data.length > 0) {
    for (const thumbnail of searchResult.data) {
      TestValidator.equals(
        "thumbnail should belong to target attachment",
        thumbnail.attachment.id,
        targetAttachment.id,
      );
    }
    // 8. Verify thumbnail metadata
    const sampleThumbnail = searchResult.data[0];
    TestValidator.predicate(
      "thumbnail should have width",
      sampleThumbnail.width > 0,
    );
    TestValidator.predicate(
      "thumbnail should have height",
      sampleThumbnail.height > 0,
    );
    TestValidator.predicate(
      "thumbnail should have size category",
      typeof sampleThumbnail.size_category === "string" &&
        sampleThumbnail.size_category.length > 0,
    );
    TestValidator.predicate(
      "thumbnail should have file size",
      sampleThumbnail.file_size > 0,
    );
    TestValidator.predicate(
      "thumbnail should have content type",
      typeof sampleThumbnail.content_type === "string" &&
        sampleThumbnail.content_type.length > 0,
    );
    // Verify thumbnail parent article matches
    TestValidator.equals(
      "thumbnail article should match original article",
      sampleThumbnail.attachment.article.id,
      article.id,
    );
  }
  // 9. Validate that thumbnails from other attachments are NOT included
  const searchResultOther =
    await api.functional.discussionBoard.admin.thumbnails.index(
      adminConnection,
      {
        body: {
          attachment_id: otherAttachment.id,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(searchResultOther);
  // If both searches return results, verify they are different
  if (searchResult.data.length > 0 && searchResultOther.data.length > 0) {
    const targetThumbnailIds = new Set(searchResult.data.map((t) => t.id));
    const otherThumbnailIds = new Set(searchResultOther.data.map((t) => t.id));
    // Verify no overlap between the two result sets
    const intersection = [...targetThumbnailIds].filter((id) =>
      otherThumbnailIds.has(id),
    );
    TestValidator.equals(
      "thumbnails for different attachments should be distinct",
      intersection.length,
      0,
    );
  }
  // 10. Validate pagination structure
  TestValidator.predicate(
    "pagination should have current page",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have limit",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have records count",
    searchResult.pagination.records >= searchResult.data.length,
  );
  TestValidator.predicate(
    "pagination should have pages count",
    searchResult.pagination.pages >= 1,
  );
  // Test pagination with different page sizes
  const paginationTest =
    await api.functional.discussionBoard.admin.thumbnails.index(
      adminConnection,
      {
        body: {
          attachment_id: targetAttachment.id,
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination limit should be respected",
    paginationTest.data.length <= 5,
    true,
  );
}
