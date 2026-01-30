import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsKarmaHistory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_karma_history_admin_view_own(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Get admin's own user ID (from authenticated response)
  const adminId = admin.id;
  // Step 3: Retrieve karma history with default pagination (no filters, cursor, or limit specified)
  const karmaHistoryPage: IPageICommunityBbsKarmaHistory =
    await api.functional.communityBbs.admin.karma_history.index(
      adminConnection,
      {
        body: {} satisfies ICommunityBbsKarmaHistory.IRequest,
      },
    );
  typia.assert(karmaHistoryPage);
  // Step 4: Validate that the retrieved karma history belongs to the authenticated admin
  // All records in the data array must have user_id equal to adminId
  const allRecordsMatchAdmin = karmaHistoryPage.data.every(
    (record) => record.user_id === adminId,
  );
  TestValidator.predicate(
    "all karma history records belong to authenticated admin",
    allRecordsMatchAdmin,
  );
  // Step 5: Validate pagination metadata is correct and within bounds
  TestValidator.equals(
    "pagination limit should be default",
    karmaHistoryPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination current page should be 1",
    karmaHistoryPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination records count should be >= 0",
    karmaHistoryPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    karmaHistoryPage.pagination.pages >= 0,
  );
}
