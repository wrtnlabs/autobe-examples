import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_attachment_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Perform attachment search with minimal criteria
  const searchResult =
    await api.functional.discussionBoard.superAdmin.search.attachments.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination structure
  TestValidator.equals("pagination metadata present", searchResult.pagination, {
    current: 1,
    limit: 10,
    records: searchResult.pagination.records,
    pages: searchResult.pagination.pages,
  });
  // 4. Validate attachment data structure
  TestValidator.predicate("has data array", Array.isArray(searchResult.data));
  for (const attachment of searchResult.data) {
    TestValidator.predicate(
      "attachment has filename",
      attachment.filename.length > 0,
    );
    TestValidator.predicate(
      "attachment has filetype",
      attachment.filetype.length > 0,
    );
    TestValidator.predicate(
      "attachment has mime_type",
      attachment.mime_type.length > 0,
    );
    TestValidator.predicate(
      "attachment has valid size",
      attachment.size_bytes >= 0,
    );
    TestValidator.predicate(
      "attachment has valid timestamp",
      new Date(attachment.created_at).getTime() > 0,
    );
    // Validate article reference structure
    TestValidator.predicate("article has id", attachment.article.id.length > 0);
    TestValidator.predicate(
      "article has title",
      attachment.article.title.length > 0,
    );
    TestValidator.predicate(
      "article has author",
      attachment.article.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "article has section",
      attachment.article.section.name.length > 0,
    );
    TestValidator.predicate(
      "article has valid timestamp",
      new Date(attachment.article.created_at).getTime() > 0,
    );
  }
}
