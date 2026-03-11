import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test pagination functionality and limits for attachment snapshot searches.
 * Validates that the system correctly handles page and limit parameters,
 * including boundary conditions like maximum page size (100 records),
 * minimum page size (1 record), and page navigation.
 */
export async function test_api_attachment_snapshot_pagination_limits(
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
  // 2. Test default pagination (no page/limit specified)
  const defaultResponse =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Validate default pagination metadata
  TestValidator.equals(
    "default pagination current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default pagination limit reasonable",
    defaultResponse.pagination.limit >= 1 &&
      defaultResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "default pagination records non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination pages non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // 3. Test minimum page size (limit=1)
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {
          limit: 1,
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit pagination limit",
    minLimitResponse.pagination.limit,
    1,
  );
  // 4. Test maximum page size (limit=100)
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit pagination limit",
    maxLimitResponse.pagination.limit,
    100,
  );
  // 5. Test page navigation if there are multiple pages
  if (defaultResponse.pagination.pages > 1) {
    // Test second page
    const secondPageResponse =
      await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
        superAdminConnection,
        {
          body: {
            page: 2,
            limit: defaultResponse.pagination.limit,
          } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
        },
      );
    typia.assert(secondPageResponse);
    TestValidator.equals(
      "second page current page",
      secondPageResponse.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page total records",
      secondPageResponse.pagination.records,
      defaultResponse.pagination.records,
    );
    TestValidator.equals(
      "second page total pages",
      secondPageResponse.pagination.pages,
      defaultResponse.pagination.pages,
    );
  }
  // 6. Test empty page handling (page beyond available data)
  const emptyPageResponse =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {
          page: defaultResponse.pagination.pages + 10,
          limit: defaultResponse.pagination.limit,
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(emptyPageResponse);
  TestValidator.equals(
    "empty page data length",
    emptyPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty page current page",
    emptyPageResponse.pagination.current,
    defaultResponse.pagination.pages + 10,
  );
  TestValidator.equals(
    "empty page total records",
    emptyPageResponse.pagination.records,
    defaultResponse.pagination.records,
  );
  TestValidator.equals(
    "empty page total pages",
    emptyPageResponse.pagination.pages,
    defaultResponse.pagination.pages,
  );
  // 7. Test consistent sorting
  const ascendingResponse =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {
          sort: "captured_at:asc",
          limit: Math.min(10, defaultResponse.pagination.records),
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(ascendingResponse);
  const descendingResponse =
    await api.functional.discussionBoard.superAdmin.attachment_snapshots.index(
      superAdminConnection,
      {
        body: {
          sort: "captured_at:desc",
          limit: Math.min(10, defaultResponse.pagination.records),
        } satisfies IDiscussionBoardAttachmentSnapshot.IRequest,
      },
    );
  typia.assert(descendingResponse);
  // Validate that different sorting produces different results
  if (ascendingResponse.data.length > 1 && descendingResponse.data.length > 1) {
    TestValidator.notEquals(
      "ascending and descending first item",
      ascendingResponse.data[0]?.id,
      descendingResponse.data[0]?.id,
    );
  }
}
