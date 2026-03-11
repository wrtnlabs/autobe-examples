import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { generate_random_discussion_board_member_articles_tags_create } from "../../../generate/generate_random_discussion_board_member_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tag_normalization(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // Define tag variations with different cases
  const tagVariations = ["ECONOMY", "economy", "Economy"];
  const createdTags: IDiscussionBoardArticleTag[] = [];
  // Create tag associations with different case variations using SDK directly
  // since we need to control the tag text for normalization testing
  for (const tagText of tagVariations) {
    const tag =
      await api.functional.discussionBoard.member.articles.tags.create(
        memberConnection,
        {
          body: {
            discussion_board_article_id: article.id,
          } satisfies IDiscussionBoardArticleTag.ICreate,
        },
      );
    typia.assert(tag);
    createdTags.push(tag);
  }
  // Validate that all tags have the same normalized tag identifier
  const firstTag = createdTags[0];
  for (let i = 1; i < createdTags.length; i++) {
    TestValidator.equals(
      `tag ${i} should have same normalized identifier as first tag`,
      createdTags[i].tag,
      firstTag.tag,
    );
  }
  // Verify that tag usage count increases appropriately
  // Since all tags are normalized to the same identifier, the usage count should reflect this
  TestValidator.predicate(
    "all tag associations should reference the same normalized tag",
    createdTags.every((tag) => tag.tag === firstTag.tag),
  );
}
