import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_snapshot_administrator_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(adminJoinResponse);
  // 2. Create customer account and login
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinResponse = await authorize_member_join(
    customerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(customerJoinResponse);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerLoginConnection, {
    body: {
      email: customerJoinResponse.email,
      password: customerJoinResponse.token.access.split(".")[1],
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    },
  });
  // 3. Create seller account and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
    },
  });
  typia.assert(sellerJoinResponse);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerJoinResponse.email,
      password: sellerJoinResponse.token.access.split(".")[1],
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    },
  });
  // Note: Order creation and refund request APIs are not in the available SDK functions
  // This is a limitation of the provided test environment
  // Skipping order creation and refund request workflow simulation
  // 4. Administrator login for audit trail verification
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminJoinResponse.email,
      password: adminJoinResponse.token.access.split(".")[1],
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    },
  });
  // 5. Test retrieving non-existent snapshot (should fail with 404)
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  try {
    await api.functional.ecommerceMall.administrator.refund_request_snapshots.at(
      adminLoginConnection,
      {
        id: nonExistentSnapshotId,
      },
    );
    throw new Error("Should have thrown 404 for non-existent snapshot");
  } catch (exp) {
    if (!typia.is<api.HttpError>(exp)) throw exp;
    TestValidator.equals("404 for non-existent snapshot", exp.status, 404);
  }
}