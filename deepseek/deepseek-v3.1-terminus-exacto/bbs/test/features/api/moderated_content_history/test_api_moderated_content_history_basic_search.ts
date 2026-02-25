import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderated_content_history_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Perform basic search with minimal filters
  const searchRequest = {
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies IDiscussionBoardModeratedContentHistory.IRequest;
  const response =
    await api.functional.discussionBoard.admin.moderated_content_histories.index(
      adminConnection,
      { body: searchRequest },
    );
  typia.assert(response);
  // Validate pagination metadata - using correct nested pagination structure
  TestValidator.equals(
    "current page",
    response.pagination.pagination.current,
    1,
  );
  TestValidator.equals("page limit", response.pagination.pagination.limit, 10);
  TestValidator.predicate(
    "records non-negative",
    response.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    response.pagination.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Validate each moderation history entry if data exists
  if (response.data.length > 0) {
    for (const history of response.data) {
      typia.assert(history);
    }
  }
}
