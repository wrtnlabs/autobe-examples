import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_promotion_request_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection (note: endpoint may require super admin privileges)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Search with non-existent user display name
  const nonExistentName = RandomGenerator.alphabets(20);
  const searchResult1 =
    await api.functional.discussionBoard.admin.promotion_requests.index(
      adminConnection,
      {
        body: {
          user_display_name: nonExistentName,
          limit: typia.random<
            number &
              typia.tags.Type<"int32"> &
              typia.tags.Minimum<1> &
              typia.tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Validate empty results for non-existent name
  TestValidator.equals(
    "empty data array for non-existent name",
    searchResult1.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-existent name",
    searchResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent name",
    searchResult1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1 for empty results",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    searchResult1.pagination.limit > 0,
  );
  // Test 2: Search with future date range
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const searchResult2 =
    await api.functional.discussionBoard.admin.promotion_requests.index(
      adminConnection,
      {
        body: {
          created_at_start: futureDate,
          limit: typia.random<
            number &
              typia.tags.Type<"int32"> &
              typia.tags.Minimum<1> &
              typia.tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Validate empty results for future date range
  TestValidator.equals(
    "empty data array for future date",
    searchResult2.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for future date",
    searchResult2.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for future date",
    searchResult2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1 for future date",
    searchResult2.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive for future date",
    searchResult2.pagination.limit > 0,
  );
}
