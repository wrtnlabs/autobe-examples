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
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test tag retrieval and tag reuse functionality when the same tag is used across multiple articles.
 *
 * This test validates the following business rules:
 * 1. Tags are created on-demand when first used in an article
 * 2. Tag names are unique across the system
 * 3. The same tag can be reused across multiple articles
 * 4. Tags can be retrieved by their UUID with complete metadata
 *
 * Test flow:
 * 1. Admin creates a section for article categorization
 * 2. Member creates first article with a specific tag name
 * 3. Member creates second article with the same tag name (validating tag reuse)
 * 4. Extract tag UUID from first article's tags array
 * 5. Retrieve tag by UUID using GET /discussionBoard/tags/{tagId}
 * 6. Verify tag exists with correct name and creation timestamp
 */
export async function test_api_tag_reuse_across_articles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section for articles
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
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
  // 2. Member setup - register and login
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
  // 3. Create first article with a specific tag name
  const tagName = RandomGenerator.name();
  const firstArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          sectionId: section.id,
          tags: [tagName],
        },
      },
    );
  typia.assert(firstArticle);
  // 4. Create second article with the same tag name (validating tag reuse)
  const secondArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          sectionId: section.id,
          tags: [tagName],
        },
      },
    );
  typia.assert(secondArticle);
  // 5. Extract tag UUID from first article's tags array
  const tagSummary = firstArticle.tags.find((t) => t.name === tagName);
  typia.assertGuard(tagSummary!);
  // 6. Retrieve tag by UUID using GET /discussionBoard/tags/{tagId}
  const retrievedTag = await api.functional.discussionBoard.tags.at(
    memberConnection,
    {
      tagId: tagSummary.id,
    },
  );
  typia.assert(retrievedTag);
  // 7. Validate tag details - business logic validation
  TestValidator.equals("tag name matches", retrievedTag.name, tagName);
  TestValidator.equals("tag ID matches", retrievedTag.id, tagSummary.id);
  // 8. Validate tag reuse - both articles share the same tag
  const secondArticleTag = secondArticle.tags.find((t) => t.name === tagName);
  typia.assertGuard(secondArticleTag!);
  TestValidator.equals(
    "tag reused in second article",
    secondArticleTag.id,
    tagSummary.id,
  );
  TestValidator.equals(
    "tag name consistent across articles",
    secondArticleTag.name,
    firstArticle.tags[0].name,
  );
}
