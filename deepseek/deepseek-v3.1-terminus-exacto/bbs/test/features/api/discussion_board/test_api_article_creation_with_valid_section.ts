import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_article_creation_with_valid_section(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate member using join utility function
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  
  // Store the section ID before creating article for comparison
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  
  // Create article using generation utility function
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 8,
        }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Validate business logic (author matches authenticated member)
  TestValidator.equals(
    "author ID matches member ID",
    article.author.id,
    member.id,
  );
  TestValidator.equals(
    "author display name matches member",
    article.author.display_name,
    member.display_name,
  );
  // Handle nullable bio comparison
  if (member.bio !== null && member.bio !== undefined) {
    TestValidator.equals(
      "author bio matches member",
      article.author.bio,
      member.bio,
    );
  } else {
    TestValidator.equals(
      "author bio is null when member bio is null",
      article.author.bio,
      null,
    );
  }
  // Validate section assignment with stored sectionId
  TestValidator.equals(
    "section ID matches input",
    article.section.id,
    sectionId,
  );
  // Validate deletion status
  TestValidator.equals(
    "deleted_at is null for active article",
    article.deleted_at,
    null,
  );
}