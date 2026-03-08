import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function test_api_admin_remove_tag_from_article(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminUser);
  adminConnection.headers = { Authorization: adminUser.token.access };
  // 2. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(memberUser);
  memberConnection.headers = { Authorization: memberUser.token.access };
  // 3. Member creates article by adding initial tag
  const articleId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.discussionBoard.member.articles.tags.addTags(
    memberConnection,
    {
      articleId: articleId,
      body: {
        tags: [RandomGenerator.name()],
      } satisfies IDiscussionBoardArticle.ITagsRequest,
    },
  );
  // 4. Admin adds a tag for testing removal
  const addTagResult =
    await api.functional.discussionBoard.admin.articles.tags.addTags(
      adminConnection,
      {
        articleId: articleId,
        body: {
          tags: ["test-tag-to-remove"],
        } satisfies IDiscussionBoardArticle.ITagsRequest,
      },
    );
  typia.assert(addTagResult);
  // 5. Admin removes the tag from the article
  await api.functional.discussionBoard.admin.articles.tags.removeArticleTag(
    adminConnection,
    {
      articleId: articleId,
      tagId: "test-tag-to-remove",
    },
  );
  // 6. Response is void (204 No Content) - implicitly validated by typia.assert() on void
}