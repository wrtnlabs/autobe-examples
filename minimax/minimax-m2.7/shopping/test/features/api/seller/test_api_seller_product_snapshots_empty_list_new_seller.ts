import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_snapshots_empty_list_new_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Login as the new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: seller.email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Call GET /seller/product-snapshots for the new seller with no products
  const output =
    await api.functional.ecommerceMall.seller.product_snapshots.list(
      sellerConnection,
    );
  typia.assert(output);
  // 4. Validate response returns 200 OK and data array is empty
  TestValidator.equals("data array should be empty", output.data.length, 0);
  // 5. Validate pagination metadata shows records=0 and pages=0
  TestValidator.equals("records should be 0", output.pagination.records, 0);
  TestValidator.equals("pages should be 0", output.pagination.pages, 0);
  TestValidator.equals("current should be 1", output.pagination.current, 1);
  TestValidator.predicate(
    "limit should be positive",
    output.pagination.limit > 0,
  );
}
