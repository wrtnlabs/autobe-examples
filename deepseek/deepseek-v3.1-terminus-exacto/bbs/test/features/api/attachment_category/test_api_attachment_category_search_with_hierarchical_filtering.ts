import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_attachment_category_search_with_hierarchical_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Search for root-level categories with realistic search term and active status
  const searchTerm = RandomGenerator.name(1); // Use realistic search term
  const requestBody: IDiscussionBoardAttachmentCategory.IRequest = {
    search: searchTerm,
    parent_id: null,
    is_active: true,
    page: 1,
    limit: 10,
  };
  const response =
    await api.functional.discussionBoard.admin.attachment_categories.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 3. Validate business logic: all returned categories should be active root categories
  for (const category of response.data) {
    TestValidator.equals("category is active", category.is_active, true);
    TestValidator.equals("category is root level", category.parent, null);
  }
  // 4. Validate pagination business logic
  TestValidator.predicate(
    "pagination records consistent with data length",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
}
