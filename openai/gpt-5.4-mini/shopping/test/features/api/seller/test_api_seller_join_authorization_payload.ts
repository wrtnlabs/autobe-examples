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

export async function test_api_seller_join_authorization_payload(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.IJoin;
  const output = await authorize_seller_join(sellerConnection, { body });
  typia.assert(output);
  TestValidator.equals(
    "seller email matches join request",
    output.email,
    body.email,
  );
  TestValidator.equals(
    "rejection reason is null",
    output.rejectionReason,
    null,
  );
  TestValidator.equals("approvedAt is null on join", output.approvedAt, null);
  TestValidator.equals("rejectedAt is null on join", output.rejectedAt, null);
  TestValidator.equals("suspendedAt is null on join", output.suspendedAt, null);
  TestValidator.equals("bannedAt is null on join", output.bannedAt, null);
  TestValidator.equals("lastLoginAt is null on join", output.lastLoginAt, null);
  TestValidator.equals("deletedAt is null on join", output.deletedAt, null);
  TestValidator.predicate(
    "approval status is initialized",
    output.approvalStatus === "pending" || output.approvalStatus.length > 0,
  );
  TestValidator.predicate(
    "account status is initialized",
    output.accountStatus.length > 0,
  );
  TestValidator.predicate(
    "access token is present",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is present",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is present",
    output.token.refreshable_until.length > 0,
  );
  TestValidator.notEquals(
    "access and refresh tokens differ",
    output.token.access,
    output.token.refresh,
  );
}
