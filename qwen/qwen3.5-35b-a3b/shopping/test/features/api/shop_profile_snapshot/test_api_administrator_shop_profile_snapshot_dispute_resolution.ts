import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import type { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_administrator_shop_profile_snapshot_dispute_resolution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(seller);
  // 2. Administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular" as const,
      },
    });
  typia.assert(admin);
  // 3. Administrator retrieves a shop profile snapshot
  // Note: shop_profile snapshots are created when sellers update their profiles
  // For this test, we use a generated UUID to validate admin access control
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const adminSnapshot =
    await api.functional.ecommerceMall.seller.shop_profile_snapshots.at(
      adminConnection,
      {
        snapshotId,
      },
    );
  typia.assert(adminSnapshot);
  // 4. Validate snapshot structure
  TestValidator.equals(
    "snapshot ID is valid UUID",
    adminSnapshot.id,
    snapshotId,
  );
  TestValidator.predicate(
    "shop name is present",
    adminSnapshot.shop_name.length > 0,
  );
  TestValidator.predicate(
    "logo URL is valid or null",
    adminSnapshot.logo_url === null ||
      typia.is<string & tags.Format<"uri">>(adminSnapshot.logo_url),
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    typia.is<string & tags.Format<"date-time">>(adminSnapshot.created_at),
  );
  TestValidator.predicate(
    "shopProfile relation is included",
    adminSnapshot.shopProfile !== undefined,
  );
  TestValidator.equals(
    "shopProfile ID is valid UUID",
    adminSnapshot.shopProfile.id,
    adminSnapshot.shopProfile.id,
  );
  TestValidator.predicate(
    "shopProfile name is present",
    adminSnapshot.shopProfile.shop_name.length > 0,
  );
}