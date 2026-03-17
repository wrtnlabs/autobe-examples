import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_profile_snapshot_admin_cross_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // Create admin account
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  // Setup first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = RandomGenerator.alphaNumeric(16);
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // First seller submits registration
  const registration1 =
    await generate_random_ecommerce_mall_seller_registrations_create(
      seller1Connection,
      {},
    );
  // Approve first seller registration
  await api.functional.ecommerceMall.admin.sellers.registrations.review(
    adminConnection,
    {
      registrationId:
        (registration1 as any).id ??
        typia.random<string & tags.Format<"uuid">>(),
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerRegistration.IReview,
    },
  );
  // Setup second seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = RandomGenerator.alphaNumeric(16);
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Second seller submits registration
  const registration2 =
    await generate_random_ecommerce_mall_seller_registrations_create(
      seller2Connection,
      {},
    );
  // Approve second seller registration
  await api.functional.ecommerceMall.admin.sellers.registrations.review(
    adminConnection,
    {
      registrationId:
        (registration2 as any).id ??
        typia.random<string & tags.Format<"uuid">>(),
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerRegistration.IReview,
    },
  );
  // Generate snapshot IDs (snapshots would exist from the registration/profile process)
  const snapshot1Id = typia.random<string & tags.Format<"uuid">>();
  const snapshot2Id = typia.random<string & tags.Format<"uuid">>();
  // Admin accesses first seller's profile snapshot (cross-seller access)
  const snapshot1 =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.at(
      adminConnection,
      {
        sellerId: seller1.id,
        snapshotId: snapshot1Id,
      },
    );
  typia.assert(snapshot1);
  // Admin accesses second seller's profile snapshot (cross-seller access)
  const snapshot2 =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.at(
      adminConnection,
      {
        sellerId: seller2.id,
        snapshotId: snapshot2Id,
      },
    );
  typia.assert(snapshot2);
  // Validate that admin successfully retrieved snapshots from both sellers
  TestValidator.equals(
    "snapshot1 sellerId matches",
    snapshot1.sellerId,
    seller1.id,
  );
  TestValidator.equals(
    "snapshot2 sellerId matches",
    snapshot2.sellerId,
    seller2.id,
  );
  TestValidator.predicate(
    "snapshot1 has valid shopName",
    typeof snapshot1.shopName === "string",
  );
  TestValidator.predicate(
    "snapshot2 has valid shopName",
    typeof snapshot2.shopName === "string",
  );
}
