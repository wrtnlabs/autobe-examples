import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test engagement analytics when no articles match the search criteria to validate proper handling of empty result sets.
 * SuperAdmin actor queries engagement metrics with highly specific filters that should return no matching articles
 * (e.g., search term that doesn't exist, non-existent section ID). The system should return a valid pagination
 * response with empty data array, zero total records, and proper pagination metadata.
 */
export async function test_api_superadmin_engagement_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Query engagement analytics with filters that should return empty results
  const response =
    await api.functional.discussionBoard.superAdmin.engagement.index(
      superAdminConnection,
      {
        body: {
          search: typia.random<string & tags.Format<"uuid">>(), // Non-existent search term
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(), // Non-existent section ID
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(response);
  // Validate empty result set structure
  TestValidator.equals("data array is empty", response.data, []);
  TestValidator.equals("total records is zero", response.pagination.records, 0);
  TestValidator.predicate(
    "current page is valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit >= 1);
  TestValidator.equals("total pages is zero", response.pagination.pages, 0);
  // Additional validation for pagination consistency
  TestValidator.predicate(
    "pagination metadata is consistent",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
}
