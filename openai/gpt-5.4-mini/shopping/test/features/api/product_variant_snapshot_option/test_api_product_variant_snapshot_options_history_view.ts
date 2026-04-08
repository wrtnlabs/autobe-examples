import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshotOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_snapshot_options_history_view(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const response =
    await api.functional.mallPlatform.administrator.products.variants.snapshots.options.index(
      adminConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductVariantSnapshotOption.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current should be at least 1 when records exist",
    response.pagination.records === 0 || response.pagination.current >= 1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    response.pagination.limit,
    10,
  );
  if (response.data.length > 0) {
    const parentSnapshotId: string = response.data[0].productVariantSnapshot.id;
    const parentProductId: string =
      response.data[0].productVariantSnapshot.product.id;
    const parentVariantId: string =
      response.data[0].productVariantSnapshot.productVariant.id;
    for (const option of response.data) {
      typia.assert(option);
      TestValidator.predicate(
        "historical option key should be a non-empty string",
        option.optionKey.length > 0,
      );
      TestValidator.predicate(
        "historical option value should be a non-empty string",
        option.optionValue.length > 0,
      );
      TestValidator.equals(
        "all option rows should belong to the same snapshot",
        option.productVariantSnapshot.id,
        parentSnapshotId,
      );
      TestValidator.equals(
        "all option rows should reference the same product as the parent snapshot",
        option.productVariantSnapshot.product.id,
        parentProductId,
      );
      TestValidator.equals(
        "all option rows should reference the same variant as the parent snapshot",
        option.productVariantSnapshot.productVariant.id,
        parentVariantId,
      );
    }
  }
}
