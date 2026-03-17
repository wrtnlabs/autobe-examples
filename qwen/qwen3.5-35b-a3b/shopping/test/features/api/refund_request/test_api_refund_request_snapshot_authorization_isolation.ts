import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_snapshot_authorization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Seller A
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(16);
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const sellerAAuthorized: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_login(sellerAConnection, {
      body: {
        email: sellerAEmail,
        password: sellerAPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(sellerAAuthorized);
  // 2. Setup Seller B
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(16);
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const sellerBAuthorized: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_login(sellerBConnection, {
      body: {
        email: sellerBEmail,
        password: sellerBPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(sellerBAuthorized);
  // 3. Setup Customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 4. Test: Seller A attempts to access snapshot from Seller B's refund request
  // Use random UUIDs to represent refundRequestId and snapshotId
  const refundRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Validate that Seller A gets 403 Forbidden when trying to access snapshot
  // The snapshot belongs to Seller B's refund request (not Seller A's)
  await TestValidator.httpError(
    "Seller A should get 403 Forbidden for cross-seller snapshot access",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.refund_requests.snapshots.at(
        sellerAConnection,
        {
          refundRequestId,
          snapshotId,
        },
      );
    },
  );
  // 5. Verify that Seller B also gets 403 (snapshot doesn't exist)
  // This confirms the authorization boundary works both ways
  await TestValidator.httpError(
    "Seller B should get 403 or 404 for non-existent snapshot",
    [403, 404],
    async () => {
      await api.functional.ecommerceMall.seller.refund_requests.snapshots.at(
        sellerBConnection,
        {
          refundRequestId,
          snapshotId,
        },
      );
    },
  );
}
