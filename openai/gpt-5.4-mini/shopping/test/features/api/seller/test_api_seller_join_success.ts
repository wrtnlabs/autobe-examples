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

export async function test_api_seller_join_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const body = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.IJoin;
  const output = await authorize_seller_join(sellerConnection, { body });
  typia.assert(output);
  TestValidator.equals(
    "seller email matches request",
    output.email,
    body.email,
  );
  TestValidator.predicate("seller id is populated", output.id.length > 0);
  TestValidator.predicate(
    "seller approval status is initialized",
    output.approvalStatus.length > 0,
  );
  TestValidator.equals(
    "seller rejection reason is null",
    output.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "seller account status is initialized",
    output.accountStatus.length > 0,
  );
  TestValidator.equals("seller approvedAt is null", output.approvedAt, null);
  TestValidator.equals("seller rejectedAt is null", output.rejectedAt, null);
  TestValidator.equals("seller suspendedAt is null", output.suspendedAt, null);
  TestValidator.equals("seller bannedAt is null", output.bannedAt, null);
  TestValidator.equals("seller lastLoginAt is null", output.lastLoginAt, null);
  TestValidator.predicate(
    "seller createdAt is populated",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "seller updatedAt is populated",
    output.updatedAt.length > 0,
  );
  TestValidator.equals("seller deletedAt is null", output.deletedAt, null);
  TestValidator.predicate(
    "access token is issued",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is issued",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry is populated",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable until is populated",
    output.token.refreshable_until.length > 0,
  );
}
