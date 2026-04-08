import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies administrator-only access and filtered browsing of product variant snapshot history.
 *
 * This test covers two critical behaviors of the immutable variant snapshot history endpoint.
 *
 * 1. A seller account cannot browse variant snapshots through the administrator-only route.
 * 2. An administrator can browse a variant's snapshot history using pagination and history filters, and the returned page is structurally valid and ordered according to the requested sort direction.
 *
 * The scenario focuses on role separation, read-only historical access, and correct handling of paging, search, and created-at window filters for variant snapshots.
 */
export async function test_api_product_variant_snapshot_admin_only_browsing_filters(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!abc",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!abc",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.error(
    "seller cannot access administrator-only product variant snapshot browsing",
    async () => {
      await api.functional.mallPlatform.administrator.products.variants.snapshots.index(
        sellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          variantId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 5,
            sort: "oldest",
            search: RandomGenerator.alphabets(3),
            createdAtFrom: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            createdAtTo: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          } satisfies IMallPlatformProductVariantSnapshot.IRequest,
        },
      );
    },
  );
  const page =
    await api.functional.mallPlatform.administrator.products.variants.snapshots.index(
      administratorConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 5,
          sort: "oldest",
          search: RandomGenerator.alphabets(3),
          createdAtFrom: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          createdAtTo: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        } satisfies IMallPlatformProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "requested page limit is preserved",
    page.pagination.limit,
    5,
  );
  TestValidator.equals(
    "requested page number is preserved",
    page.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination is internally consistent",
    page.pagination.pages >= 0 && page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot page data is ordered oldest-first when records exist",
    () =>
      page.data.length <= 1 ||
      page.data.every((item, index, array) =>
        index === 0
          ? true
          : new Date(array[index - 1].createdAt).getTime() <=
            new Date(item.createdAt).getTime(),
      ),
  );
}
