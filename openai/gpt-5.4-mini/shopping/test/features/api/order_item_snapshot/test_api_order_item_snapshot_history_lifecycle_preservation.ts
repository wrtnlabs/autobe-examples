import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_history_lifecycle_preservation(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
    sort: "-snapshotAt",
  } satisfies IMallPlatformOrderItemSnapshot.IRequest;
  const first =
    await api.functional.mallPlatform.customer.order_items.snapshots.index(
      customerConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.customer.order_items.snapshots.index(
      customerConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "snapshot page should be stable across repeated reads",
    first,
    second,
  );
  TestValidator.predicate(
    "pagination page should match requested page",
    first.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match requested limit",
    first.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records should be non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    first.pagination.pages >= 0,
  );
}
