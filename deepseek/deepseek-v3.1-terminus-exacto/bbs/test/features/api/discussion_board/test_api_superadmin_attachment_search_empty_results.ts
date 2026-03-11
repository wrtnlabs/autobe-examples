import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_attachment_search_empty_results(
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
  // Test 1: Search with improbable filename pattern
  const searchResult1 =
    await api.functional.discussionBoard.superAdmin.search.attachments.index(
      superAdminConnection,
      {
        body: {
          search: "!@#$%^&*()_+-=[]{}|;':\",./<>?", // Highly improbable characters
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Validate empty results
  TestValidator.equals("empty data array", searchResult1.data, []);
  TestValidator.equals("zero records", searchResult1.pagination.records, 0);
  TestValidator.equals("zero pages", searchResult1.pagination.pages, 0);
  TestValidator.equals("current page 1", searchResult1.pagination.current, 1);
  TestValidator.equals("limit matches", searchResult1.pagination.limit, 10);
  // Test 2: Mutually exclusive size criteria
  const searchResult2 =
    await api.functional.discussionBoard.superAdmin.search.attachments.index(
      superAdminConnection,
      {
        body: {
          size_min: 1000000, // 1MB min
          size_max: 100, // 100 bytes max
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Validate empty results
  TestValidator.equals(
    "empty data array for conflicting criteria",
    searchResult2.data,
    [],
  );
  TestValidator.equals(
    "zero records for conflicting criteria",
    searchResult2.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for conflicting criteria",
    searchResult2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page 1 for conflicting criteria",
    searchResult2.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches for conflicting criteria",
    searchResult2.pagination.limit,
    5,
  );
}
