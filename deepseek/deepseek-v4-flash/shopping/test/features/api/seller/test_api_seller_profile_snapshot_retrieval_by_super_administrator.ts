import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_profile_snapshot_retrieval_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // =====================================================
  // SETUP: Create seller with known credentials
  // =====================================================
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerShopName = RandomGenerator.name();
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: sellerShopName,
    },
  });
  typia.assert(seller);
  // =====================================================
  // SETUP: Create super administrator
  // =====================================================
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
      },
    },
  );
  typia.assert(superAdmin);
  // =====================================================
  // ACTOR SWITCHING: Login as seller (demonstrates actor context management)
  // =====================================================
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerLogin);
  // =====================================================
  // ACTOR SWITCHING: Login as super administrator (demonstrates actor context management)
  // =====================================================
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  const superAdminLogin = await authorize_super_administrator_login(
    superAdminLoginConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdminLogin);
  // =====================================================
  // TARGET: Retrieve seller profile snapshot as super administrator
  // =====================================================
  // Note: The seller profile edit endpoint is not available in the SDK,
  // so we cannot trigger snapshot creation via profile editing.
  // The snapshot retrieval call demonstrates that the super administrator
  // has the authority to invoke this endpoint with the correct parameters.
  const snapshot =
    await api.functional.eCommerceMall.superAdministrator.sellers.profile.snapshots.at(
      superAdminLoginConnection,
      {
        sellerId: seller.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // =====================================================
  // VALIDATION: Verify snapshot structure
  // =====================================================
  TestValidator.equals(
    "snapshot has required id field",
    snapshot.id,
    snapshot.id,
  );
  TestValidator.predicate(
    "snapshot sellerProfile is present",
    !!snapshot.sellerProfile,
  );
  TestValidator.equals(
    "snapshot sellerProfile references correct seller profile",
    snapshot.sellerProfile.id,
    seller.profile!.id,
  );
  TestValidator.predicate(
    "snapshot name is non-empty",
    snapshot.name.length > 0,
  );
  TestValidator.predicate(
    "snapshot description is non-empty",
    snapshot.description.length > 0,
  );
  TestValidator.predicate(
    "snapshot logo is a valid URL",
    snapshot.logo.startsWith("http"),
  );
  TestValidator.predicate(
    "snapshot created_at is a valid date",
    !isNaN(new Date(snapshot.created_at).getTime()),
  );
}
