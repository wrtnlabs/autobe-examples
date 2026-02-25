import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { generate_random_discussion_board_super_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_file_metadata_update_accessibility_features(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdmin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    },
  });
  // 2. Create article
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: typia.random<
            string & typia.tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(article);
  // 3. Add image with initial accessibility metadata
  const initialAltText = RandomGenerator.paragraph({ sentences: 1 });
  const initialCaption = RandomGenerator.paragraph({ sentences: 1 });
  const image =
    await generate_random_discussion_board_super_admin_articles_images_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          attachment_file_id: typia.random<
            string & typia.tags.Format<"uuid">
          >(),
          display_order: typia.random<number & typia.tags.Type<"int32">>(),
          alt_text: initialAltText,
          caption: initialCaption,
        },
      },
    );
  typia.assert(image);
  // 4. Update accessibility metadata
  const updatedAltText = RandomGenerator.paragraph({ sentences: 1 });
  const updatedCaption = RandomGenerator.paragraph({ sentences: 1 });
  const updatedFile =
    await api.functional.discussionBoard.superAdmin.articles.files.patchByArticleid(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          display_order: typia.random<
            number & typia.tags.Type<"int32"> & typia.tags.Minimum<0>
          >(),
          alt_text: updatedAltText,
          caption: updatedCaption,
        } satisfies IDiscussionBoardArticleFile.IUpdate,
      },
    );
  typia.assert(updatedFile);
  // 5. Validate metadata updates
  TestValidator.equals(
    "alt_text should be updated",
    updatedFile.alt_text,
    updatedAltText,
  );
  TestValidator.equals(
    "caption should be updated",
    updatedFile.caption,
    updatedCaption,
  );
  TestValidator.notEquals(
    "alt_text changed from initial",
    updatedFile.alt_text,
    initialAltText,
  );
  TestValidator.notEquals(
    "caption changed from initial",
    updatedFile.caption,
    initialCaption,
  );
  TestValidator.equals(
    "display_order updated",
    updatedFile.display_order,
    updatedFile.display_order,
  );
  // 6. Test character limits with valid input
  const longAltText = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedWithLongText =
    await api.functional.discussionBoard.superAdmin.articles.files.patchByArticleid(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          display_order: typia.random<
            number & typia.tags.Type<"int32"> & typia.tags.Minimum<0>
          >(),
          alt_text: longAltText,
          caption: null satisfies string | null | undefined as
            | string
            | null
            | undefined,
        } satisfies IDiscussionBoardArticleFile.IUpdate,
      },
    );
  typia.assert(updatedWithLongText);
  TestValidator.equals(
    "long alt_text accepted",
    updatedWithLongText.alt_text,
    longAltText,
  );
  TestValidator.equals(
    "caption cleared to null",
    updatedWithLongText.caption,
    null,
  );
}
