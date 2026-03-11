import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardImageAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_article_attachment_image_metadata_admin_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Create article as member
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Add image attachment to article
  const attachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "test-image.jpg",
          filetype: "jpg",
          mime_type: "image/jpeg",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // 4. Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 5. Test valid image metadata update
  const validUpdate =
    await api.functional.discussionBoard.admin.articles.attachments.image_metadata.update(
      adminConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: {
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          altText: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardImageAttachment.IUpdate,
      },
    );
  typia.assert(validUpdate);
  // 6. Test non-existent attachment
  await TestValidator.error(
    "should reject non-existent attachment",
    async () => {
      await api.functional.discussionBoard.admin.articles.attachments.image_metadata.update(
        adminConnection,
        {
          articleId: article.id,
          attachmentId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            width: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            height: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IDiscussionBoardImageAttachment.IUpdate,
        },
      );
    },
  );
  // 7. Test member user cannot update image metadata
  await TestValidator.error("should reject member user", async () => {
    await api.functional.discussionBoard.admin.articles.attachments.image_metadata.update(
      memberConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: {
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardImageAttachment.IUpdate,
      },
    );
  });
  // 8. Test attachment ownership validation - create another article and try to update attachment from wrong article
  const anotherArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(anotherArticle);
  await TestValidator.error(
    "should reject attachment from wrong article",
    async () => {
      await api.functional.discussionBoard.admin.articles.attachments.image_metadata.update(
        adminConnection,
        {
          articleId: anotherArticle.id,
          attachmentId: attachment.id,
          body: {
            width: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            height: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IDiscussionBoardImageAttachment.IUpdate,
        },
      );
    },
  );
}
