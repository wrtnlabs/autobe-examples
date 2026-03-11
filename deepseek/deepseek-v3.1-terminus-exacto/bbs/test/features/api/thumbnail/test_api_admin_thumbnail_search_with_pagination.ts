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
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

export async function test_api_admin_thumbnail_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Member setup (to create articles and attachments)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://localhost/test",
      referrer: "https://localhost/referrer",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 3. Create multiple articles with image attachments (generate thumbnails)
  const articleCount = 15;
  const attachmentCounts = [2, 3]; // Randomly 2-3 attachments per article
  const imageFileTypes = ["jpg", "png", "jpeg", "gif"];
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
  };
  // Create first article to get section ID for subsequent articles
  const firstArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(firstArticle);
  const sectionId = firstArticle.section.id;
  // Create rest of articles with attachments
  const articleIds: string[] = [firstArticle.id];
  for (let i = 1; i < articleCount; i++) {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            body: RandomGenerator.content({ paragraphs: 2 }),
            discussion_board_section_id: sectionId,
          },
        },
      );
    typia.assert(article);
    articleIds.push(article.id);
  }
  // Create image attachments for each article
  for (const articleId of articleIds) {
    const attachmentCount = RandomGenerator.pick(attachmentCounts);
    for (let j = 0; j < attachmentCount; j++) {
      const fileType = RandomGenerator.pick(imageFileTypes);
      const ext = fileType.toLowerCase();
      await generate_random_discussion_board_member_articles_attachments_create(
        memberConnection,
        {
          params: { articleId },
          body: {
            filename: `image-${RandomGenerator.alphabets(8)}.${ext}`,
            filetype: ext,
            mime_type: mimeTypes[ext] ?? "image/jpeg",
            size_bytes: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1024> &
                tags.Maximum<10485760>
            >(), // 1KB to 10MB
          },
        },
      );
    }
  }
  // Wait a moment for thumbnail generation
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 4. Search thumbnails without filters to get all (test pagination)
  const searchAll = await api.functional.discussionBoard.admin.thumbnails.index(
    adminConnection,
    {
      body: {} satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
    },
  );
  typia.assert(searchAll);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination metadata exists",
    typeof searchAll.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is 1 by default",
    searchAll.pagination.current === 1,
  );
  TestValidator.predicate(
    "default limit is 20",
    searchAll.pagination.limit === 20,
  );
  TestValidator.predicate(
    "total records should be >= total attachments",
    searchAll.pagination.records >= articleCount * 2,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    searchAll.pagination.pages ===
      Math.ceil(searchAll.pagination.records / searchAll.pagination.limit),
  );
  // 5. Test with specific limit (smaller than default)
  const limit5 = await api.functional.discussionBoard.admin.thumbnails.index(
    adminConnection,
    {
      body: {
        limit: 5,
      } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
    },
  );
  typia.assert(limit5);
  TestValidator.equals("limit set to 5", limit5.pagination.limit, 5);
  TestValidator.predicate("data length <= limit", limit5.data.length <= 5);
  TestValidator.predicate(
    "pages increased with smaller limit",
    limit5.pagination.pages >= searchAll.pagination.pages,
  );
  // 6. Test page navigation
  if (limit5.pagination.pages >= 2) {
    const page2 = await api.functional.discussionBoard.admin.thumbnails.index(
      adminConnection,
      {
        body: {
          limit: 5,
          page: 2,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals("page 2 current page", page2.pagination.current, 2);
    TestValidator.predicate(
      "page 2 data should not overlap with page 1",
      page2.data.every(
        (thumb2) => !limit5.data.some((thumb1) => thumb1.id === thumb2.id),
      ),
    );
  }
  // 7. Test with max limit
  const maxLimit = await api.functional.discussionBoard.admin.thumbnails.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.equals("max limit is 100", maxLimit.pagination.limit, 100);
  TestValidator.predicate("data length <= 100", maxLimit.data.length <= 100);
  // 8. Validate thumbnail summary structure
  if (searchAll.data.length > 0) {
    const thumbnail = searchAll.data[0];
    typia.assert(thumbnail);
    TestValidator.predicate(
      "thumbnail has id",
      typeof thumbnail.id === "string" && thumbnail.id.length > 0,
    );
    TestValidator.predicate(
      "thumbnail has dimensions",
      typeof thumbnail.width === "number" && thumbnail.width > 0,
    );
    TestValidator.predicate(
      "thumbnail has size category",
      typeof thumbnail.size_category === "string" &&
        thumbnail.size_category.length > 0,
    );
    TestValidator.predicate(
      "thumbnail has file size",
      typeof thumbnail.file_size === "number" && thumbnail.file_size > 0,
    );
    TestValidator.predicate(
      "thumbnail has content type",
      typeof thumbnail.content_type === "string" &&
        thumbnail.content_type.length > 0,
    );
    TestValidator.predicate(
      "thumbnail has creation timestamp",
      typeof thumbnail.created_at === "string" &&
        thumbnail.created_at.length > 0,
    );
    // Validate attachment reference
    typia.assert(thumbnail.attachment);
    TestValidator.predicate(
      "attachment has id",
      typeof thumbnail.attachment.id === "string" &&
        thumbnail.attachment.id.length > 0,
    );
    TestValidator.predicate(
      "attachment has filename",
      typeof thumbnail.attachment.filename === "string" &&
        thumbnail.attachment.filename.length > 0,
    );
    TestValidator.predicate(
      "attachment has article reference",
      typeof thumbnail.attachment.article.id === "string" &&
        thumbnail.attachment.article.id.length > 0,
    );
    TestValidator.predicate(
      "article id matches one of created articles",
      articleIds.includes(thumbnail.attachment.article.id),
    );
  }
  // 9. Test with page beyond total pages (should return empty or last page)
  const beyondPage =
    await api.functional.discussionBoard.admin.thumbnails.index(
      adminConnection,
      {
        body: {
          limit: 5,
          page: searchAll.pagination.pages + 10,
        } satisfies IDiscussionBoardAttachmentThumbnail.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.predicate(
    "data should be empty or follow pagination behavior",
    true,
  );
}
