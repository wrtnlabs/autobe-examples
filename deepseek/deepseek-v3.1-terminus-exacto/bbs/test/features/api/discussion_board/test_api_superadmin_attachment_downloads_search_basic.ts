import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentDownload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_attachment_downloads_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Perform basic search without filters
  const searchResult =
    await api.functional.discussionBoard.superAdmin.attachment_downloads.index(
      superAdminConnection,
      {
        body: {
          // Empty request to get all recent downloads
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.equals("pagination structure", searchResult.pagination, {
    current: searchResult.pagination.current,
    limit: searchResult.pagination.limit,
    records: searchResult.pagination.records,
    pages: searchResult.pagination.pages,
  } satisfies IPage.IPagination);
  // Validate pagination values (business logic checks)
  TestValidator.predicate(
    "current page >= 0",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit between 1-100",
    searchResult.pagination.limit >= 1 && searchResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count >= 0",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count >= 0",
    searchResult.pagination.pages >= 0,
  );
  // Validate each download record (business logic checks only)
  for (const download of searchResult.data) {
    typia.assert(download);
    // Validate attachment details exist (business logic)
    TestValidator.predicate(
      "attachment has filename",
      download.attachment.filename.length > 0,
    );
    TestValidator.predicate(
      "attachment has filetype",
      download.attachment.filetype.length > 0,
    );
    TestValidator.predicate(
      "attachment has mime_type",
      download.attachment.mime_type.length > 0,
    );
    TestValidator.predicate(
      "attachment has valid size",
      download.attachment.size_bytes >= 0,
    );
    // Validate article reference exists (business logic)
    TestValidator.predicate(
      "article has title",
      download.attachment.article.title.length > 0,
    );
    TestValidator.predicate(
      "article has author",
      download.attachment.article.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "article has section",
      download.attachment.article.section.name.length > 0,
    );
    TestValidator.predicate(
      "article has valid comment count",
      download.attachment.article.comments_count >= 0,
    );
  }
}
