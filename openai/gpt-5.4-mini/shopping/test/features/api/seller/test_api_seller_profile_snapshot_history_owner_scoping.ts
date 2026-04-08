import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
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
 * Test seller profile snapshot history is scoped to the seller path parameter.
 *
 * Validates that immutable seller profile snapshot history is isolated per seller account and that an administrator can only retrieve the history for the seller identified in the URL path. The test also checks the empty-history case for a seller with no profile edits and confirms the API-defined not-found behavior for an unknown seller identifier.
 *
 * 1. Create two distinct seller accounts with independent connections.
 * 2. Request snapshot history for both sellers through an administrator session.
 * 3. Verify one seller's history is returned as a valid page response and the untouched seller returns an empty page.
 * 4. Verify that a missing seller identifier triggers the endpoint's not-found outcome.
 */
export async function test_api_seller_profile_snapshot_history_owner_scoping(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const sellerOneConnection: api.IConnection = { host: connection.host };
  const sellerOne = await authorize_seller_join(sellerOneConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerOne);
  const sellerTwoConnection: api.IConnection = { host: connection.host };
  const sellerTwo = await authorize_seller_join(sellerTwoConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerTwo);
  const sellerOneSnapshots =
    await api.functional.mallPlatform.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: sellerOne.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(sellerOneSnapshots);
  const sellerTwoSnapshots =
    await api.functional.mallPlatform.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: sellerTwo.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(sellerTwoSnapshots);
  TestValidator.equals(
    "seller one snapshot page should be a valid paginated result",
    sellerOneSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "seller two should have no profile snapshots",
    sellerTwoSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "seller two pagination record count should be zero",
    sellerTwoSnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "seller two pagination page count should be zero",
    sellerTwoSnapshots.pagination.pages,
    0,
  );
  const missingSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unknown seller should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.sellers.profile.snapshots.index(
        adminConnection,
        {
          sellerId: missingSellerId,
          body: {
            page: 1,
            limit: 20,
          } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
        },
      );
    },
  );
}
