import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_profile_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: typia.random<string & tags.Format<"uuid">>(),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(authorized);
  // Seller ID to query profile snapshots for
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 1. Filter with both gte and lte (March 2026)
  const withBothBounds =
    await api.functional.eCommerceMall.superAdministrator.sellers.profile.snapshots.index(
      superAdminConnection,
      {
        sellerId,
        body: {
          created_at: {
            gte: "2026-03-01T00:00:00.000Z",
            lte: "2026-03-31T23:59:59.999Z",
          },
        },
      },
    );
  typia.assert(withBothBounds);
  for (const snapshot of withBothBounds.data) {
    TestValidator.predicate(
      "snapshot created_at within March 2026",
      () =>
        snapshot.created_at >= "2026-03-01T00:00:00.000Z" &&
        snapshot.created_at <= "2026-03-31T23:59:59.999Z",
    );
  }
  // 2. Filter with only gte (April 1, 2026 onwards)
  const withGteOnly =
    await api.functional.eCommerceMall.superAdministrator.sellers.profile.snapshots.index(
      superAdminConnection,
      {
        sellerId,
        body: {
          created_at: {
            gte: "2026-04-01T00:00:00.000Z",
          },
        },
      },
    );
  typia.assert(withGteOnly);
  for (const snapshot of withGteOnly.data) {
    TestValidator.predicate(
      "snapshot created_at on or after April 1 2026",
      () => snapshot.created_at >= "2026-04-01T00:00:00.000Z",
    );
  }
  // 3. Filter with only lte (on or before Feb 28, 2026)
  const withLteOnly =
    await api.functional.eCommerceMall.superAdministrator.sellers.profile.snapshots.index(
      superAdminConnection,
      {
        sellerId,
        body: {
          created_at: {
            lte: "2026-02-28T23:59:59.999Z",
          },
        },
      },
    );
  typia.assert(withLteOnly);
  for (const snapshot of withLteOnly.data) {
    TestValidator.predicate(
      "snapshot created_at on or before Feb 28 2026",
      () => snapshot.created_at <= "2026-02-28T23:59:59.999Z",
    );
  }
  // 4. No filter (returns all snapshots ordered by created_at descending)
  const allSnapshots =
    await api.functional.eCommerceMall.superAdministrator.sellers.profile.snapshots.index(
      superAdminConnection,
      {
        sellerId,
        body: {},
      },
    );
  typia.assert(allSnapshots);
}
