import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings } from "../../../generate/generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";

export async function test_api_article_tag_mappings_update_edge_case_handling_duplicates_and_no_ops(
  connection: api.IConnection,
): Promise<void> {
  // Actor connections
  const superAdminConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // Prepare and register a super administrator with known password
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminJoin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdminJoin);
  // Login as super administrator
  const superAdminLogin = await authorize_super_administrator_login(
    superAdminConnection,
    {
      body: {
        email: superAdminJoin.email,
        password: superAdminPassword,
      },
    },
  );
  typia.assert(superAdminLogin);
  // Prepare and register a registered user
  const userJoin = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "userPass12345",
    },
  });
  typia.assert(userJoin);
  // Login as registered user
  const userLogin = await authorize_registered_user_login(userConnection, {
    body: {
      email: userJoin.email,
      password: "userPass12345",
    },
  });
  typia.assert(userLogin);
  // Create an article as registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(article);
  // Create initial tag mappings for the article
  // 3 random tags
  const tagIdsInitial = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const tagMappingsInitial =
    await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings(
      userConnection,
      {
        params: { articleId: article.id },
        body: tagIdsInitial.map((tagId) => ({
          discussion_board_article_id: article.id,
          discussion_board_tag_id: tagId,
        })) as any,
      },
    );
  typia.assert(tagMappingsInitial);
  TestValidator.equals(
    "Initial tag count",
    tagMappingsInitial.data.length,
    tagIdsInitial.length,
  );
  // Define a generic valid dummy UUID for required discussionBoardTagId
  const dummyTagId = typia.random<string & tags.Format<"uuid">>();
  // (a) Add duplicate tags (tags already mapped to article) - should be ignored
  const updateAddDuplicate = {
    discussionBoardArticleId: article.id,
    discussionBoardTagId: dummyTagId,
    add: tagIdsInitial.slice(0, 2),
    remove: [],
  };
  const updatedAfterDuplicateAdd =
    await api.functional.discussionBoard.superAdministrator.articles.tag_mappings.updateTagMappings(
      superAdminConnection,
      {
        articleId: article.id,
        body: updateAddDuplicate,
      },
    );
  typia.assert(updatedAfterDuplicateAdd);
  const tagsAfterDuplicateAdd = updatedAfterDuplicateAdd.tags
    .map((t) => t.id)
    .sort();
  TestValidator.equals(
    "Tags unchanged after duplicate add",
    tagsAfterDuplicateAdd,
    tagIdsInitial.slice().sort(),
  );
  // (b) Remove tags not currently mapped - should be ignored
  const fakeRemoveTags = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const updateRemoveNonExistent = {
    discussionBoardArticleId: article.id,
    discussionBoardTagId: dummyTagId,
    add: [],
    remove: fakeRemoveTags,
  };
  const updatedAfterNonExistentRemove =
    await api.functional.discussionBoard.superAdministrator.articles.tag_mappings.updateTagMappings(
      superAdminConnection,
      {
        articleId: article.id,
        body: updateRemoveNonExistent,
      },
    );
  typia.assert(updatedAfterNonExistentRemove);
  const tagsAfterNonExistentRemove = updatedAfterNonExistentRemove.tags
    .map((t) => t.id)
    .sort();
  TestValidator.equals(
    "Tags unchanged after non-existent remove",
    tagsAfterNonExistentRemove,
    tagIdsInitial.slice().sort(),
  );
  // (c) Update with empty add and remove lists - tags remain unchanged
  const updateEmpty = {
    discussionBoardArticleId: article.id,
    discussionBoardTagId: dummyTagId,
    add: [],
    remove: [],
  };
  const updatedAfterEmptyUpdate =
    await api.functional.discussionBoard.superAdministrator.articles.tag_mappings.updateTagMappings(
      superAdminConnection,
      {
        articleId: article.id,
        body: updateEmpty,
      },
    );
  typia.assert(updatedAfterEmptyUpdate);
  const tagsAfterEmptyUpdate = updatedAfterEmptyUpdate.tags
    .map((t) => t.id)
    .sort();
  TestValidator.equals(
    "Tags unchanged after empty update",
    tagsAfterEmptyUpdate,
    tagIdsInitial.slice().sort(),
  );
  // (d) Mixed add and remove for atomicity and correctness
  // New tags
  const newTagsToAdd = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const tagToRemove = tagIdsInitial[0];
  const updateMixed = {
    discussionBoardArticleId: article.id,
    discussionBoardTagId: dummyTagId,
    add: newTagsToAdd,
    remove: [tagToRemove],
  };
  const updatedAfterMixed =
    await api.functional.discussionBoard.superAdministrator.articles.tag_mappings.updateTagMappings(
      superAdminConnection,
      {
        articleId: article.id,
        body: updateMixed,
      },
    );
  typia.assert(updatedAfterMixed);
  const expectedFinalTags = tagIdsInitial.slice(1).concat(newTagsToAdd).sort();
  const tagsAfterMixed = updatedAfterMixed.tags.map((t) => t.id).sort();
  TestValidator.equals(
    "Tags after mixed update",
    tagsAfterMixed,
    expectedFinalTags,
  );
}
