import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_administrator_tags_create_tag } from "../../../generate/generate_random_discussion_board_administrator_tags_create_tag";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_discussion_board_administrator_article_tag_mappings_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins to get an authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
    },
  });
  typia.assert(admin);
  // 2. Registered user joins and logs in to create an article
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "UserPass123!",
    },
  });
  typia.assert(userJoin);
  // 3. Registered user creates article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(article);
  // 4. Administrator creates multiple tags
  const tags: IDiscussionBoardArticleTag[] = [];
  const tagCount = 3;
  for (let i = 0; i < tagCount; i++) {
    const tag =
      await generate_random_discussion_board_administrator_tags_create_tag(
        adminConnection,
        {
          body: {
            name: `tag-${RandomGenerator.alphabets(6)}`,
          },
        },
      );
    typia.assert(tag);
    tags.push(tag);
  }
  // 5. Administrator updates article's tag mappings, adding all tags
  const updateAddBody = {
    discussionBoardArticleId: article.id,
    discussionBoardTagId: tags[0].id,
  } satisfies IDiscussionBoardArticleTagMapping.IUpdate;
  // Actually update more than one tag mapping; this utility updates one by one, so for this test, we call the update endpoint multiple times for different tags
  // However, the update endpoint only allows batch for one tag update? According to the input, it seems one IUpdate object per call. Adjust test to call for each tag separately.
  // So, call updateTagMappings for each tag to add
  for (const tag of tags) {
    const updateBody = {
      discussionBoardArticleId: article.id,
      discussionBoardTagId: tag.id,
    } satisfies IDiscussionBoardArticleTagMapping.IUpdate;
    const updatedArticle =
      await api.functional.discussionBoard.administrator.articles.tag_mappings.updateTagMappings(
        adminConnection,
        {
          articleId: article.id,
          body: updateBody,
        },
      );
    typia.assert(updatedArticle);
    // Verify tag is included
    const found = updatedArticle.tags.find((t) => t.id === tag.id);
    TestValidator.predicate(
      `tag ${tag.name} present after adding`,
      found !== undefined,
    );
  }
  // 6. Administrator updates article's tag mappings to remove one tag and add a new one
  // Remove the first tag
  const tagToRemove = tags[0];
  // Create a new tag
  const newTag =
    await generate_random_discussion_board_administrator_tags_create_tag(
      adminConnection,
      {
        body: {
          name: `newtag-${RandomGenerator.alphabets(6)}`,
        },
      },
    );
  typia.assert(newTag);
  // Update should now remove tagToRemove and add newTag
  // Since the update endpoint only deals with one tag per call (?), we call once to remove and once to add
  // Remove tagToRemove: By passing tagToRemove id to update endpoint to remove tag mapping (but original endpoint only has one payload of IUpdate? It looks this is for adding mapping, so removal mechanism? Unclear.)
  // The scenario mentions "Remove some tags and add others" for testing correctness.
  // Given no utility function for delete tag mapping, skip removal test
  // Because we only have the update endpoint to add mappings.
  // So to test removal, we can only update the article with new tag mappings excluding tagToRemove, if possible (unclear from provided info)
  // However, the provided update API only accepts IUpdate which maps one tag to article
  // So no batch add or removal in one call, and no remove call visible.
  // Because there's no direct removal method, skip removal in this test, mark as TODO if feature added later
  // Add newTag mapping
  const updatedArticleAfterAdd =
    await api.functional.discussionBoard.administrator.articles.tag_mappings.updateTagMappings(
      adminConnection,
      {
        articleId: article.id,
        body: {
          discussionBoardArticleId: article.id,
          discussionBoardTagId: newTag.id,
        },
      },
    );
  typia.assert(updatedArticleAfterAdd);
  // Verify newTag present
  const foundNewTag = updatedArticleAfterAdd.tags.find(
    (t) => t.id === newTag.id,
  );
  TestValidator.predicate(
    `new tag ${newTag.name} present after adding`,
    foundNewTag !== undefined,
  );
  // 7. Confirm unauthorized users cannot perform update
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // No auth header
  await TestValidator.error(
    "unauthorized user cannot update tag mappings",
    async () => {
      await api.functional.discussionBoard.administrator.articles.tag_mappings.updateTagMappings(
        unauthorizedConnection,
        {
          articleId: article.id,
          body: {
            discussionBoardArticleId: article.id,
            discussionBoardTagId: tags[1].id,
          },
        },
      );
    },
  );
}
