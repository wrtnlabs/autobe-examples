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

export async function test_api_superadmin_attachment_downloads_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResponse);
  // Test pagination with different parameters
  const testCases = [
    { page: 1, limit: 10 },
    { page: 2, limit: 5 },
    { page: 1, limit: 1 },
    { page: 1, limit: 100 },
    { page: 999, limit: 10 }, // Page beyond expected total
  ] as const;
  for (const testCase of testCases) {
    const response =
      await api.functional.discussionBoard.superAdmin.attachment_downloads.index(
        superAdminConnection,
        {
          body: {
            page: testCase.page,
            limit: testCase.limit,
          } satisfies IDiscussionBoardAttachmentDownload.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      `current page matches for page ${testCase.page}, limit ${testCase.limit}`,
      response.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      `limit matches for page ${testCase.page}`,
      response.pagination.limit,
      testCase.limit,
    );
    TestValidator.predicate(
      `records count non-negative for page ${testCase.page}`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pages count non-negative for page ${testCase.page}`,
      response.pagination.pages >= 0,
    );
    // Validate pagination calculations
    const expectedPages =
      response.pagination.records === 0
        ? 0
        : Math.ceil(response.pagination.records / testCase.limit);
    TestValidator.equals(
      `pages calculation correct for page ${testCase.page}`,
      response.pagination.pages,
      expectedPages,
    );
    // Validate data array size based on page position
    if (
      testCase.page > response.pagination.pages ||
      response.pagination.pages === 0
    ) {
      // Page beyond total pages or no pages should have empty data
      TestValidator.equals(
        `empty data for page beyond total for page ${testCase.page}`,
        response.data.length,
        0,
      );
    } else if (testCase.page === response.pagination.pages) {
      // Last page may have fewer items
      const expectedRemaining = response.pagination.records % testCase.limit;
      const expectedSize =
        expectedRemaining === 0 ? testCase.limit : expectedRemaining;
      TestValidator.equals(
        `last page data size correct for page ${testCase.page}`,
        response.data.length,
        expectedSize,
      );
    } else {
      // Regular page should have full limit
      TestValidator.equals(
        `data size matches limit for page ${testCase.page}`,
        response.data.length,
        testCase.limit,
      );
    }
  }
}
