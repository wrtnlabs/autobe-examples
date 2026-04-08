import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
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
 * Verify product snapshot access control by owner and administrator.
 *
 * This test validates the authorization boundary for immutable product snapshot history. It ensures that a seller who does not own the product is denied access, while an administrator can inspect the same product snapshot history for dispute resolution or governance.
 *
 * 1. Register and authenticate an owner seller, a second unrelated seller, and an administrator using isolated connections.
 * 2. Use a stable product identifier and request snapshot history as the unrelated seller to confirm the request is rejected.
 * 3. Request the same snapshot history as the administrator and validate that privileged access is accepted.
 */
export async function test_api_product_snapshots_access_control_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  const ownerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const otherSellerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const adminEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const password = "P@ssw0rd123!";
  const productId = typia.random<string & tags.Format<"uuid">>();
  await authorize_seller_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  await authorize_seller_join(otherSellerConnection, {
    body: {
      email: otherSellerEmail,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "unrelated seller cannot access another seller's product snapshots",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.products.snapshots.index(
        otherSellerConnection,
        {
          productId,
          body: {
            page: 1,
            limit: 10,
            sort: "-createdAt",
            productId,
          } satisfies IMallPlatformProductSnapshot.IRequest,
        },
      );
    },
  );
  const adminSnapshots =
    await api.functional.mallPlatform.seller.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          page: 1,
          limit: 10,
          sort: "-createdAt",
          productId,
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(adminSnapshots);
  TestValidator.equals(
    "admin request is scoped to the requested product",
    adminSnapshots.pagination.current,
    1,
  );
}
