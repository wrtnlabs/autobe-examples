import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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

/**
 * Verifies administrator access to a seller storefront identity snapshot history.
 *
 * This test authenticates an administrator, requests the immutable snapshot timeline for a seller, and validates that the returned page follows the shared pagination contract while preserving historical storefront values.
 *
 * 1. Register an administrator session using the provided authorization utility.
 * 2. Request storefront identity snapshot history for a seller scope.
 * 3. Validate pagination metadata and snapshot summary fields.
 * 4. Confirm newest-first ordering when multiple snapshots are returned.
 */
export async function test_api_seller_storefront_identity_snapshots_list_history(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: RandomGenerator.alphabets(12) satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sellerId = typia.random<string & typia.tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 20,
    order: "desc",
  } satisfies IMallPlatformSellerProfileSnapshot.IRequest;
  const response =
    await api.functional.mallPlatform.administrator.sellers.storefront_identity.snapshots.index(
      administratorConnection,
      {
        sellerId,
        body: request,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page should match the request",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match the request",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination record count should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count should be non-negative",
    response.pagination.pages >= 0,
  );
  if (response.data.length > 0) {
    const firstSnapshot = response.data[0];
    typia.assert(firstSnapshot);
    TestValidator.predicate(
      "snapshot id should be present",
      firstSnapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot shop name should be preserved",
      firstSnapshot.shopName.length > 0,
    );
    TestValidator.predicate(
      "snapshot shop description should be preserved",
      firstSnapshot.shopDescription.length > 0,
    );
    TestValidator.predicate(
      "snapshot createdAt should be present",
      firstSnapshot.createdAt.length > 0,
    );
    if (firstSnapshot.logoImageUri !== null) {
      TestValidator.predicate(
        "snapshot logo URI should be present when not null",
        firstSnapshot.logoImageUri.length > 0,
      );
    }
    for (let i = 1; i < response.data.length; ++i) {
      const previous = response.data[i - 1];
      const current = response.data[i];
      TestValidator.predicate(
        "snapshot history should be ordered newest first",
        previous.createdAt >= current.createdAt,
      );
    }
  }
  const repeatResponse =
    await api.functional.mallPlatform.administrator.sellers.storefront_identity.snapshots.index(
      administratorConnection,
      {
        sellerId,
        body: request,
      },
    );
  typia.assert(repeatResponse);
  TestValidator.equals(
    "repeat retrieval should preserve pagination metadata",
    repeatResponse.pagination,
    response.pagination,
  );
  TestValidator.equals(
    "repeat retrieval should preserve snapshot history content",
    repeatResponse.data,
    response.data,
  );
}
