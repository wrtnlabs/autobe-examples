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

export async function test_api_superadmin_analytics_downloads_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Create comprehensive filter request
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const filterRequest = {
    actor_type: "member" as const,
    created_at_start: thirtyDaysAgo.toISOString(),
    created_at_end: now.toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAttachmentDownload.IRequest;
  // Call the analytics endpoint
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.analytics.downloads.index(
      superAdminConnection,
      {
        body: filterRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "has valid current page",
    analyticsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "has valid limit",
    analyticsResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "has valid records count",
    analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    analyticsResponse.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.equals(
    "data is array",
    Array.isArray(analyticsResponse.data),
    true,
  );
  // Validate individual download records if present
  if (analyticsResponse.data.length > 0) {
    for (const download of analyticsResponse.data) {
      typia.assert(download);
      // Validate business logic - actor type matches filter
      TestValidator.equals(
        "actor type matches filter",
        download.actor_type,
        "member",
      );
      // Validate timestamp is within filter range
      const downloadTime = new Date(download.created_at);
      TestValidator.predicate(
        "download time within range",
        downloadTime >= thirtyDaysAgo && downloadTime <= now,
      );
      // Validate attachment structure
      typia.assert(download.attachment);
      // Validate article structure
      typia.assert(download.attachment.article);
      // Validate author structure
      typia.assert(download.attachment.article.author);
      // Validate section structure
      typia.assert(download.attachment.article.section);
      // Validate tags array structure
      TestValidator.equals(
        "tags is array",
        Array.isArray(download.attachment.article.tags),
        true,
      );
      for (const tag of download.attachment.article.tags) {
        typia.assert(tag);
      }
    }
  }
}
