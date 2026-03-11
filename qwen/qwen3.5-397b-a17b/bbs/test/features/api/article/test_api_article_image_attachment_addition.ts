import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test adding new image attachments to an existing article.
 *
 * This test validates the complete workflow:
 * 1. Member registration and authentication
 * 2. Admin creates a section (prerequisite)
 * 3. Member creates an article in the section
 * 4. Member adds image attachments to their article
 * 5. Validates response contains updated article summary
 */
export async function test_api_article_image_attachment_addition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Admin creates a section (prerequisite for article creation)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 3. Member creates an article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // 4. Prepare image metadata for addition
  const imageMetadata: IDiscussionBoardArticleImage.ICreate[] =
    ArrayUtil.repeat(2, () => ({
      name: `${RandomGenerator.alphabets(8)}.jpg`,
      size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5000000>
      >(),
      type: RandomGenerator.pick([
        "image/jpeg",
        "image/png",
        "image/gif",
      ] as const),
      url: typia.random<string & tags.Format<"uri">>(),
      width: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
      >(),
      height: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
      >(),
    }));
  // 5. Add images to the article using PATCH endpoint
  const updateBody: IDiscussionBoardArticleImage.IUpdate = {
    add: imageMetadata,
    remove: [],
  };
  const updatedArticle =
    await api.functional.discussionBoard.articles.images.updateImages(
      memberConnection,
      {
        articleId: article.id,
        body: updateBody satisfies IDiscussionBoardArticleImage.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // 6. Validate the response (IDiscussionBoardArticle.ISummary)
  TestValidator.equals("article id matches", updatedArticle.id, article.id);
  TestValidator.equals(
    "article title matches",
    updatedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "author id matches",
    updatedArticle.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "author display name matches",
    updatedArticle.author.display_name,
    memberAuth.display_name,
  );
  TestValidator.predicate(
    "tags array exists",
    Array.isArray(updatedArticle.tags),
  );
  TestValidator.predicate(
    "comments count is non-negative",
    updatedArticle.comments_count >= 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      updatedArticle.created_at,
    ),
  );
}
