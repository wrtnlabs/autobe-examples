import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that viewing a seller profile snapshot for a non‑existent seller returns 404 Not Found.
 *
 * Validates the business rule that when no seller exists with the given sellerId (and deleted_at is null), the endpoint returns a 404 error. Since the seller lookup is performed first, the error occurs regardless of whether the snapshot UUID itself exists.
 *
 * Only administrator authentication is required; no seller setup is needed.
 *
 * 1. Administrator registers a new account via the join endpoint.
 * 2. Administrator calls the snapshot retrieval endpoint with random UUIDs for both the seller and the snapshot.
 * 3. Validate that the server responds with a 404 Not Found status.
 */
export async function test_api_administrator_views_snapshot_of_nonexistent_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Attempt to retrieve a snapshot for a non-existent seller
  await TestValidator.httpError("404 when seller does not exist", 404, () =>
    api.functional.eCommerceMall.administrator.sellers.profile.snapshots.at(
      adminConnection,
      {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    ),
  );
}
