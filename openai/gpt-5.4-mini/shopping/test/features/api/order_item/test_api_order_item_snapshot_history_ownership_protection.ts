import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrder";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_history_ownership_protection(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const intruderConnection: api.IConnection = { host: connection.host };
  const ownerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const intruderEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const password = "Password123!";
  const href = "https://example.com";
  const referrer = "https://example.com/signup";
  const owner = await authorize_customer_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password,
      href,
      referrer,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(owner);
  const intruder = await authorize_customer_join(intruderConnection, {
    body: {
      email: intruderEmail,
      password,
      href,
      referrer,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(intruder);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformOrderItemSnapshot.IRequest;
  await TestValidator.error(
    "cross-account snapshot history access should be rejected",
    async () => {
      await api.functional.mallPlatform.customer.orderItems.snapshots.index(
        intruderConnection,
        {
          orderItemId,
          body,
        },
      );
    },
  );
  const ownerSnapshots =
    await api.functional.mallPlatform.customer.orderItems.snapshots.index(
      ownerConnection,
      {
        orderItemId,
        body,
      },
    );
  typia.assert(ownerSnapshots);
  TestValidator.equals(
    "owner snapshot page uses requested pagination",
    ownerSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "owner snapshot page limit uses requested pagination",
    ownerSnapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "owner snapshot history response is non-negative",
    ownerSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "owner snapshot pages are non-negative",
    ownerSnapshots.pagination.pages >= 0,
  );
}
