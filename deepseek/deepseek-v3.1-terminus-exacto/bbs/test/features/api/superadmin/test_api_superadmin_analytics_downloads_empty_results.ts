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

export async function test_api_superadmin_analytics_downloads_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create filter criteria that will likely return empty results
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year in future
  const filterCriteria: IDiscussionBoardAttachmentDownload.IRequest = {
    created_at_start: futureDate.toISOString(),
    created_at_end: new Date(
      futureDate.getTime() + 1000 * 60 * 60 * 24,
    ).toISOString(), // +1 day
    ip: typia.random<string & tags.Format<"ipv4">>(), // Random IP that likely doesn't exist
    actor_type: "guest", // Narrow actor type
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAttachmentDownload.IRequest;
  // Call analytics endpoint with narrow filter
  const response =
    await api.functional.discussionBoard.superAdmin.analytics.downloads.index(
      superAdminConnection,
      {
        body: filterCriteria,
      },
    );
  typia.assert(response);
  // Validate empty results
  TestValidator.equals("data array should be empty", response.data.length, 0);
  TestValidator.equals(
    "total records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("total pages should be 0", response.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    response.pagination.limit,
    10,
  );
}
