import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
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

export async function test_api_seller_order_item_snapshot_authorization_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(sellerA);
  // 2. Create Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(sellerB);
  // 3. Login both sellers
  const sellerALogin: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_login(sellerAConnection, {
      body: {
        email: sellerA.email,
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(sellerALogin);
  const sellerBLogin: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_login(sellerBConnection, {
      body: {
        email: sellerB.email,
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(sellerBLogin);
  // 4. Seller A lists their snapshots
  const sellerASnapshots: IPageIEcommerceMallOrderItemSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
      sellerAConnection,
      {
        body: {
          changedBySellerId: sellerA.id,
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(sellerASnapshots);
  // 5. Seller B lists their snapshots
  const sellerBSnapshots: IPageIEcommerceMallOrderItemSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.orderItemSnapshots.index(
      sellerBConnection,
      {
        body: {
          changedBySellerId: sellerB.id,
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(sellerBSnapshots);
  // 6. If Seller A has snapshots, test authorization
  if (sellerASnapshots.data.length > 0) {
    // Seller A retrieves their own snapshot (should succeed)
    const ownSnapshotId = sellerASnapshots.data[0].id;
    const ownSnapshot: IEcommerceMallOrderItemSnapshot =
      await api.functional.ecommerceMall.seller.order_item_snapshots.at(
        sellerAConnection,
        {
          snapshotId: ownSnapshotId,
        },
      );
    typia.assert(ownSnapshot);
    // Verify the snapshot was processed by Seller A
    TestValidator.equals(
      "snapshot processed by seller A",
      ownSnapshot.changedBySeller.id,
      sellerA.id,
    );
    // 7. If Seller B has snapshots, test cross-seller access (should fail)
    if (sellerBSnapshots.data.length > 0) {
      const otherSnapshotId = sellerBSnapshots.data[0].id;
      // Seller A tries to access Seller B's snapshot (should fail with 403)
      await TestValidator.httpError(
        "cannot access other seller's snapshot",
        403,
        async () => {
          await api.functional.ecommerceMall.seller.order_item_snapshots.at(
            sellerAConnection,
            {
              snapshotId: otherSnapshotId,
            },
          );
        },
      );
    }
  }
}
