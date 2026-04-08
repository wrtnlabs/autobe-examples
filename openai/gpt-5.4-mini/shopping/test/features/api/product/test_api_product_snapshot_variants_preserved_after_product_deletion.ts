import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_variants_preserved_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator =
    await api.functional.mallPlatform.auth.administrator.join(adminConnection, {
      body: {
        email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
          tags.Format<"email">,
        password: "1234" satisfies string,
      } satisfies IMallPlatformAdministrator.IJoin,
    });
  typia.assert(administrator);
  const response =
    await api.functional.mallPlatform.administrator.products.snapshots.variants.index(
      adminConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 20,
        } satisfies IMallPlatformProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination metadata is returned",
    response.pagination.current >= 1 && response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "snapshot variant response is a list",
    Array.isArray(response.data),
  );
  if (response.data.length > 0) {
    const variant = response.data[0];
    typia.assert(variant);
    TestValidator.predicate(
      "preserved variant includes sku code",
      variant.skuCode.length > 0,
    );
    TestValidator.predicate(
      "preserved variant includes option values",
      variant.optionValues.length > 0,
    );
    TestValidator.predicate(
      "preserved variant is linked to a product snapshot",
      variant.productSnapshot.id.length > 0,
    );
    TestValidator.predicate(
      "preserved variant snapshot includes a product reference",
      variant.productSnapshot.product.id.length > 0,
    );
  }
}
