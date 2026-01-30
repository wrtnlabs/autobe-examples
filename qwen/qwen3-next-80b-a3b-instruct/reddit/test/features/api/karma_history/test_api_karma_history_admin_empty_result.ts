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
export async function test_api_karma_history_admin_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  // Step 2: Use non-existent UUID for member_id
  const nonExistentMemberId = "00000000-0000-0000-0000-000000000000";
  // Step 3: Call karma history endpoint with non-existent member_id
  const result: IPageICommunityBbsKarmaHistory =
    await api.functional.communityBbs.admin.karma_history.index(
      adminConnection,
      {
        body: {
          member_id: nonExistentMemberId,
        } satisfies ICommunityBbsKarmaHistory.IRequest,
      },
    );
  // Step 4: Validate response structure and content
  typia.assert(result);
  // Step 5: Verify pagination metadata
  TestValidator.equals(
    "pagination records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    result.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination limit should be default",
    result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current should be 1",
    result.pagination.current,
    1,
  );
  // Step 6: Verify data array is empty
  TestValidator.equals("data array should be empty", result.data.length, 0);
}
