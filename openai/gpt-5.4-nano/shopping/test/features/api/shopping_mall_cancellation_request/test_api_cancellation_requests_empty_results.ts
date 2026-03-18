import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_cancellation_requests_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member actor connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Join as a new member
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // Use a non-existent/unique order item id to guarantee empty results.
  // This avoids creating any cancellation request records.
  const nonExistentShoppingMallOrderItemId = typia.random<
    string & tags.Format<"uuid">
  >();
  const output =
    await api.functional.shoppingMall.member.cancellation_requests.index(
      memberConnection,
      {
        body: {
          shoppingMallOrderItemId: nonExistentShoppingMallOrderItemId,
          page: 1,
          limit: 10,
          includeDeleted: false,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "empty pagination records",
    output.pagination.records,
    0,
  );
  TestValidator.equals("empty pagination pages", output.pagination.pages, 0);
  TestValidator.equals("empty data array", output.data.length, 0);
}
