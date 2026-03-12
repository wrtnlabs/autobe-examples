import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_tags_create } from "../../../generate/generate_random_discussion_board_member_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_tag_removal_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 2. Member A setup - create article
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const article = await generate_random_discussion_board_member_articles_create(
    memberAConnection,
    {
      body: {
        section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(article);
  // 3. Member A assigns a tag to their article
  const tagAssignment =
    await generate_random_discussion_board_member_articles_tags_create(
      memberAConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          tagNames: ["test-tag-for-authorization"],
        },
      },
    );
  typia.assert(tagAssignment);
  const tagToRemove = tagAssignment.tag;
  // 4. Member B setup - different member
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 5. Attempt to remove tag as member B (should fail with 403)
  await TestValidator.httpError(
    "member B cannot remove tag from member A's article",
    403,
    async () =>
      await api.functional.discussionBoard.member.articles.tags.erase(
        memberBConnection,
        {
          articleId: article.id,
          tagId: tagToRemove.id,
        },
      ),
  );
  // 6. Verify that member A (the author) can still remove the tag
  await api.functional.discussionBoard.member.articles.tags.erase(
    memberAConnection,
    {
      articleId: article.id,
      tagId: tagToRemove.id,
    },
  );
  TestValidator.predicate(
    "member A can successfully remove tag from their own article",
    true,
  );
}
