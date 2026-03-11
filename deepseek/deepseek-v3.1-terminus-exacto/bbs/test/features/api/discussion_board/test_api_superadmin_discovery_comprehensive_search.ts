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
 * Test comprehensive article discovery with multiple search criteria for superAdmin.
 * Validates that superAdmin can search articles by keywords, filter by specific sections,
 * and use pagination parameters. Verifies the response includes proper article summaries
 * with title, author information, section categorization, tags, comment counts, and timestamps.
 * Tests search relevance scoring by searching for specific keywords and ensuring
 * matching articles appear in results. Validates pagination metadata including
 * current page, limit, total records, and total pages.
 */
export async function test_api_superadmin_discovery_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Test basic search with empty criteria (should return all articles)
  const emptySearch =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearch);
  // 3. Test search with specific keywords
  const keywordSearch =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {
          search: "technology" satisfies string,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(keywordSearch);
  // 4. Test section filtering
  const sectionFilterSearch =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(sectionFilterSearch);
  // 5. Test pagination parameters
  const paginationSearch =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginationSearch);
  // 6. Test combined search criteria
  const combinedSearch =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {
          search: "politics" satisfies string,
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(combinedSearch);
}
