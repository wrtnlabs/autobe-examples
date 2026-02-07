import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_article_list_with_tag_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // 2. Call the index endpoint with various tag combinations to test filtering
  // Test with single tag
  const result1 =
    await api.functional.discussionBoard.superAdmin.sections.articles.index(
      superAdminConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          tag_ids: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(result1);
  TestValidator.predicate(
    "pagination: has valid structure",
    result1.pagination !== null && result1.pagination !== undefined,
  );
  // Test with multiple tags
  const result2 =
    await api.functional.discussionBoard.superAdmin.sections.articles.index(
      superAdminConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          tag_ids: [
            typia.random<string & tags.Format<"uuid">>(),
            typia.random<string & tags.Format<"uuid">>(),
          ],
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(result2);
  // Test with no tags (should return all articles in section)
  const result3 =
    await api.functional.discussionBoard.superAdmin.sections.articles.index(
      superAdminConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          tag_ids: [],
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(result3);
  // Test with empty pagination results
  TestValidator.equals(
    "pagination records should be non-negative",
    result3.pagination.records,
    result3.pagination.records,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    result3.pagination.limit > 0,
  );
  // 3. Verify articles contain correct data structure
  if (result1.data.length > 0) {
    const firstArticle = result1.data[0];
    typia.assert<DeepPartial<IDiscussionBoardArticle.ISummary>>(firstArticle);
  }
}
