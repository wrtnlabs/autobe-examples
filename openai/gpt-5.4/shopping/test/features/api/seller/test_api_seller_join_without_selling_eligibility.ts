import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_join_without_selling_eligibility(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const authorized = await authorize_seller_join(sellerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);
  TestValidator.equals(
    "joined seller email matches input",
    authorized.email,
    joinBody.email,
  );
  TestValidator.equals(
    "new seller approval status is pending",
    authorized.approval_status,
    "pending",
  );
  TestValidator.equals(
    "new seller has no rejection reason",
    authorized.rejection_reason,
    null,
  );
  TestValidator.equals(
    "new seller is not suspended",
    authorized.suspended,
    false,
  );
  TestValidator.equals("new seller is not banned", authorized.banned, false);
  TestValidator.notEquals("seller id is populated", authorized.id, "");
  TestValidator.notEquals(
    "access token is populated",
    authorized.token.access,
    "",
  );
  TestValidator.notEquals(
    "refresh token is populated",
    authorized.token.refresh,
    "",
  );
  TestValidator.predicate(
    "seller connection is authenticated after join",
    typeof sellerConnection.headers?.Authorization === "string" &&
      sellerConnection.headers.Authorization.length > 0,
  );
}
