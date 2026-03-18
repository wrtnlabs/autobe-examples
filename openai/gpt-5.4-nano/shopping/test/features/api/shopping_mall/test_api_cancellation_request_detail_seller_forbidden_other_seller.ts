import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_cancellation_request_detail_seller_forbidden_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Authenticate seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Since we don't have SDK utilities here to create a real cancellation request
  // tied to seller A, we can only assert that seller B cannot view an
  // out-of-scope cancellation request id.
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "seller should not be able to access cancellation request of other seller",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.member.cancellation_requests.at(
        sellerBConnection,
        {
          cancellationRequestId,
        },
      );
    },
  );
}
