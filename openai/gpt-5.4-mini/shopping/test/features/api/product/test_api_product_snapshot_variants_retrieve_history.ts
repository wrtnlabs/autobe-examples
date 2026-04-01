import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_snapshot_variants_retrieve_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const output =
    await api.functional.mallPlatform.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 20,
        } satisfies IMallPlatformProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current is positive",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "result size does not exceed page limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages matches records and limit",
    output.pagination.pages,
    output.pagination.limit === 0
      ? 0
      : Math.ceil(output.pagination.records / output.pagination.limit),
  );
  for (const row of output.data) {
    typia.assert(row);
    typia.assert(row.productSnapshot);
    TestValidator.predicate("row id exists", row.id.length > 0);
    TestValidator.predicate("sku code exists", row.skuCode.length > 0);
    TestValidator.predicate("option values exist", row.optionValues.length > 0);
    TestValidator.predicate("createdAt exists", row.createdAt.length > 0);
    TestValidator.predicate(
      "availability is boolean",
      typeof row.isAvailable === "boolean",
    );
    TestValidator.predicate(
      "snapshot id exists",
      row.productSnapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot product name exists",
      row.productSnapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "snapshot product description exists",
      row.productSnapshot.productDescription.length > 0,
    );
    TestValidator.predicate(
      "snapshot base price is valid",
      row.productSnapshot.basePrice >= 0,
    );
    TestValidator.predicate(
      "snapshot variant count is valid",
      row.productSnapshot.variantCount >= 0,
    );
    TestValidator.predicate(
      "snapshot image count is valid",
      row.productSnapshot.imageCount >= 0,
    );
  }
  for (let i: number = 1; i < output.data.length; i++) {
    TestValidator.predicate(
      "default ordering is nondecreasing by createdAt",
      output.data[i - 1].createdAt <= output.data[i].createdAt,
    );
  }
}
