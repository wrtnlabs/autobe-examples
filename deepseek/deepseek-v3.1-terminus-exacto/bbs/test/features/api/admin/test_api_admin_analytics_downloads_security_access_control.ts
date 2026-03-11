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

export async function test_api_admin_analytics_downloads_security_access_control(
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
  // Test 1: Valid administrator access
  const analyticsResponse =
    await api.functional.discussionBoard.admin.analytics.downloads.index(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Validate response structure includes security context
  TestValidator.predicate(
    "response has pagination",
    analyticsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(analyticsResponse.data),
  );
  if (analyticsResponse.data.length > 0) {
    const downloadRecord = analyticsResponse.data[0];
    TestValidator.predicate(
      "download record has IP address",
      downloadRecord.ip !== undefined,
    );
    TestValidator.predicate(
      "download record has actor type",
      downloadRecord.actor_type !== undefined,
    );
    TestValidator.predicate(
      "download record has attachment",
      downloadRecord.attachment !== undefined,
    );
  }
  // Test 2: Unauthorized access attempt (base connection without admin auth)
  await TestValidator.httpError(
    "unauthorized access should fail",
    401,
    async () => {
      await api.functional.discussionBoard.admin.analytics.downloads.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardAttachmentDownload.IRequest,
        },
      );
    },
  );
  // Test 3: Filter by actor type
  const filteredResponse =
    await api.functional.discussionBoard.admin.analytics.downloads.index(
      adminConnection,
      {
        body: {
          actor_type: "member" as const,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // Validate filtered results contain only member actor type
  if (filteredResponse.data.length > 0) {
    TestValidator.predicate(
      "all records should be member type",
      filteredResponse.data.every((record) => record.actor_type === "member"),
    );
  }
}
