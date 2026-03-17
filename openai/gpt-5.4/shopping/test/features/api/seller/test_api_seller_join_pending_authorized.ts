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

export async function test_api_seller_join_pending_authorized(
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
  TestValidator.equals(
    "registered seller email matches input",
    authorized.email,
    joinBody.email,
  );
  TestValidator.equals(
    "new seller approval status is pending",
    authorized.approval_status,
    "pending",
  );
  TestValidator.equals(
    "new seller rejection reason is null",
    authorized.rejection_reason,
    null,
  );
  TestValidator.equals(
    "new seller is not suspended",
    authorized.suspended,
    false,
  );
  TestValidator.equals("new seller is not banned", authorized.banned, false);
  TestValidator.equals(
    "new seller is not soft deleted",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is populated",
    authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is populated",
    authorized.updated_at.length > 0,
  );
  TestValidator.predicate(
    "access token is populated",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is populated",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access expiration is populated",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshability deadline is populated",
    authorized.token.refreshable_until.length > 0,
  );
  TestValidator.equals(
    "seller connection authorization header is established",
    sellerConnection.headers?.authorization,
    authorized.token.access,
  );
  TestValidator.equals(
    "registration does not imply approved merchant authority",
    authorized.approval_status,
    "pending",
  );
}
