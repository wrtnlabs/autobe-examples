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

export async function test_api_superadmin_attachment_downloads_filtered_search(
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
  // Test 1: Search by actor type
  const actorTypeSearch =
    await api.functional.discussionBoard.superAdmin.attachment_downloads.index(
      superAdminConnection,
      {
        body: {
          actor_type: "member" as const,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(actorTypeSearch);
  // Validate all results have actor_type = "member"
  for (const download of actorTypeSearch.data) {
    TestValidator.equals(
      "actor type filter validation",
      download.actor_type,
      "member",
    );
  }
  // Test 2: Search by date range
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeSearch =
    await api.functional.discussionBoard.superAdmin.attachment_downloads.index(
      superAdminConnection,
      {
        body: {
          created_at_start: yesterday,
          created_at_end: tomorrow,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  // Test 3: Search by IP address pattern
  const ipSearch =
    await api.functional.discussionBoard.superAdmin.attachment_downloads.index(
      superAdminConnection,
      {
        body: {
          ip: typia.random<string & tags.Format<"ipv4">>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(ipSearch);
  // Test 4: Search by user agent pattern
  const userAgentSearch =
    await api.functional.discussionBoard.superAdmin.attachment_downloads.index(
      superAdminConnection,
      {
        body: {
          user_agent: RandomGenerator.substring(
            RandomGenerator.content({ paragraphs: 1 }),
          ),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(userAgentSearch);
  // Test 5: Empty result set test with impossible date range
  const emptySearch =
    await api.functional.discussionBoard.superAdmin.attachment_downloads.index(
      superAdminConnection,
      {
        body: {
          created_at_start: tomorrow,
          created_at_end: yesterday, // Impossible range
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty result set validation",
    emptySearch.data.length,
    0,
  );
  // Test 6: Combined filters
  const combinedSearch =
    await api.functional.discussionBoard.superAdmin.attachment_downloads.index(
      superAdminConnection,
      {
        body: {
          actor_type: "admin" as const,
          created_at_start: yesterday,
          ip: typia.random<string & tags.Format<"ipv4">>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current value validation",
    combinedSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit value validation",
    combinedSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count validation",
    combinedSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count validation",
    combinedSearch.pagination.pages >= 0,
  );
}
