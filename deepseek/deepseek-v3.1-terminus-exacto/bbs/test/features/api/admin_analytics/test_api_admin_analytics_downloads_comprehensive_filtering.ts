import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentDownload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_downloads_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Basic filtering by date range
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeResult =
    await api.functional.discussionBoard.admin.analytics.downloads.index(
      adminConnection,
      {
        body: {
          created_at_start: yesterday,
          created_at_end: today,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Test 2: Actor type filtering
  const actorTypes = ["guest", "member", "admin", "super_admin"] as const;
  for (const actorType of actorTypes) {
    const actorResult =
      await api.functional.discussionBoard.admin.analytics.downloads.index(
        adminConnection,
        {
          body: {
            actor_type: actorType,
            limit: 5,
            page: 1,
          } satisfies IDiscussionBoardAttachmentDownload.IRequest,
        },
      );
    typia.assert(actorResult);
  }
  // Test 3: IP address pattern filtering
  const ipResult =
    await api.functional.discussionBoard.admin.analytics.downloads.index(
      adminConnection,
      {
        body: {
          ip: typia.random<string & tags.Format<"ipv4">>(),
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(ipResult);
  // Test 4: User agent filtering
  const userAgentResult =
    await api.functional.discussionBoard.admin.analytics.downloads.index(
      adminConnection,
      {
        body: {
          user_agent: "Mozilla",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(userAgentResult);
  // Test 5: Pagination with different page sizes
  const pageSizes = [1, 10, 25, 50] as const;
  for (const limit of pageSizes) {
    const paginationResult =
      await api.functional.discussionBoard.admin.analytics.downloads.index(
        adminConnection,
        {
          body: {
            limit: limit satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
            page: 1 satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
          } satisfies IDiscussionBoardAttachmentDownload.IRequest,
        },
      );
    typia.assert(paginationResult);
    TestValidator.equals(
      `pagination limit ${limit}`,
      paginationResult.pagination.limit,
      limit,
    );
  }
  // Test 6: Empty result set scenario (future date range)
  const emptyResult =
    await api.functional.discussionBoard.admin.analytics.downloads.index(
      adminConnection,
      {
        body: {
          created_at_start: tomorrow,
          created_at_end: tomorrow,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Test 7: Non-existent attachment filtering
  const nonExistentResult =
    await api.functional.discussionBoard.admin.analytics.downloads.index(
      adminConnection,
      {
        body: {
          discussion_board_attachment_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(nonExistentResult);
  // Test 8: Combined filtering
  const combinedResult =
    await api.functional.discussionBoard.admin.analytics.downloads.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
          created_at_start: yesterday,
          created_at_end: today,
          ip: typia.random<string & tags.Format<"ipv4">>(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate response structure
  TestValidator.predicate(
    "has pagination metadata",
    combinedResult.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(combinedResult.data));
  TestValidator.predicate(
    "pagination has current page",
    combinedResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    combinedResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    combinedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    combinedResult.pagination.pages >= 0,
  );
}
