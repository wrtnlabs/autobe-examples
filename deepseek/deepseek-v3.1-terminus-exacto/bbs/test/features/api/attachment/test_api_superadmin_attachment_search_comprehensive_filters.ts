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

export async function test_api_superadmin_attachment_search_comprehensive_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Prepare search criteria with comprehensive filters
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const searchCriteria: IDiscussionBoardAttachment.IRequest = {
    search: "report",
    filetype: "pdf",
    size_min: 1024,
    size_max: 10485760,
    created_after: oneYearAgo.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAttachment.IRequest;
  // Execute the search with comprehensive filters using authorized connection
  const searchResult =
    await api.functional.discussionBoard.superAdmin.search.attachments.index(
      superAdminConnection, // Use the connection with updated authorization headers
      {
        body: searchCriteria,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "records count non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate each attachment meets the filter criteria (business logic validation)
  for (const attachment of searchResult.data) {
    typia.assert(attachment);
    // Business logic validation: filename contains search term
    TestValidator.predicate(
      "filename contains search term",
      attachment.filename.toLowerCase().includes("report"),
    );
    // Business logic validation: filetype matches filter
    TestValidator.equals(
      "filetype matches filter",
      attachment.filetype.toLowerCase(),
      "pdf",
    );
    // Business logic validation: file size within specified range
    TestValidator.predicate(
      "file size within minimum bound",
      attachment.size_bytes >= 1024,
    );
    TestValidator.predicate(
      "file size within maximum bound",
      attachment.size_bytes <= 10485760,
    );
    // Business logic validation: creation date within specified range
    const attachmentDate = new Date(attachment.created_at);
    TestValidator.predicate(
      "attachment created after specified date",
      attachmentDate >= oneYearAgo,
    );
  }
  // Test pagination functionality if multiple pages exist
  if (searchResult.pagination.pages > 1) {
    const page2Criteria: IDiscussionBoardAttachment.IRequest = {
      ...searchCriteria,
      page: 2,
    } satisfies IDiscussionBoardAttachment.IRequest;
    const page2Result =
      await api.functional.discussionBoard.superAdmin.search.attachments.index(
        superAdminConnection,
        {
          body: page2Criteria,
        },
      );
    typia.assert(page2Result);
    // Validate pagination consistency
    TestValidator.equals(
      "page 2 current page",
      page2Result.pagination.current,
      2,
    );
    TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
    TestValidator.equals(
      "total records consistent across pages",
      page2Result.pagination.records,
      searchResult.pagination.records,
    );
  }
}
