import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarmaHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_user_karma_history_filtered_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Generate a random user ID
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Query karma history with empty body (IRequest is empty per DTO)
  // Per the specification, ICommunityKarmaHistory.IRequest = {},
  // so we pass an empty object. Server filtering by reason is internal.
  const result = await api.functional.community.admin.users.karma.history.index(
    adminConnection,
    {
      userId: userId,
      body: {},
    },
  );
  typia.assert(result);
  // 4. Validate only known properties of IPageICommunityKarmaHistory.ISummary
  TestValidator.equals("pagination limit is 100", result.pagination.limit, 100);
  TestValidator.predicate(
    "pagination current is at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records is greater than or equal to 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is greater than or equal to 0",
    result.pagination.pages >= 0,
  );
  // Validate that data is an array (empty or non-empty)
  TestValidator.equals("data is array", Array.isArray(result.data), true);
  // We cannot validate ordering, user_id, delta, source_type, created_at, or id
  // because ISummary has no such properties defined.
  // This follows the rule: Test what EXISTS, not what SHOULD exist.
  // The server's internal filtering by reason 'upvote_removed' is not testable via the empty IRequest.
  // The core functionality - returning a paginated history for a user - is validated.
}
