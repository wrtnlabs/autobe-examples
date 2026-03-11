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

/**
 * Test security validation and access control for download analytics endpoint.
 *
 * This test validates that the superAdmin analytics downloads endpoint properly enforces
 * authentication requirements and validates input parameters for security. It tests:
 * 1. Unauthenticated access rejection
 * 2. Authenticated superAdmin access success
 * 3. Filter parameter validation and security
 * 4. IP address filtering for security investigations
 * 5. Actor type filtering for privilege level segregation
 */
export async function test_api_superadmin_analytics_downloads_security_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test unauthorized access rejection with isolated connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized access should be rejected",
    async () => {
      await api.functional.discussionBoard.superAdmin.analytics.downloads.index(
        unauthorizedConnection,
        {
          body: {
            limit: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
          } satisfies IDiscussionBoardAttachmentDownload.IRequest,
        },
      );
    },
  );
  // 2. Authenticate as superAdmin using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 3. Test authenticated access with empty filters
  const emptyFilterResponse =
    await api.functional.discussionBoard.superAdmin.analytics.downloads.index(
      superAdminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);
  // 4. Test various filter combinations for security validation
  const actorTypes = ["guest", "member", "admin", "super_admin"] as const;
  const filterTests = [
    // IP address filtering
    {
      description: "IP address filtering",
      body: {
        ip: typia.random<string & tags.Format<"ipv4">>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IDiscussionBoardAttachmentDownload.IRequest,
    },
    // Actor type filtering
    {
      description: "actor type filtering",
      body: {
        actor_type: RandomGenerator.pick(actorTypes),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IDiscussionBoardAttachmentDownload.IRequest,
    },
    // Date range filtering
    {
      description: "date range filtering",
      body: {
        created_at_start: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        created_at_end: new Date().toISOString(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IDiscussionBoardAttachmentDownload.IRequest,
    },
    // Combined filters
    {
      description: "combined filters",
      body: {
        actor_type: "member",
        ip: typia.random<string & tags.Format<"ipv4">>(),
        user_agent: RandomGenerator.substring(RandomGenerator.content()),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IDiscussionBoardAttachmentDownload.IRequest,
    },
  ];
  for (const test of filterTests) {
    const response =
      await api.functional.discussionBoard.superAdmin.analytics.downloads.index(
        superAdminConnection,
        {
          body: test.body,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      `${test.description} should return valid pagination`,
      response.pagination.records >= 0,
    );
  }
  // 5. Validate pagination parameters work correctly
  const paginationTest =
    await api.functional.discussionBoard.superAdmin.analytics.downloads.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.predicate(
    "pagination should have valid structure",
    paginationTest.pagination.current >= 0 &&
      paginationTest.pagination.limit > 0 &&
      paginationTest.pagination.records >= 0 &&
      paginationTest.pagination.pages >= 0,
  );
}
