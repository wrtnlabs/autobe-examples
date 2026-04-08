import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
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

export async function test_api_seller_profile_snapshot_retrieval_after_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerJoinConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 2. Admin authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerceMall.auth.admin.login(
    adminLoginConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(adminAuth);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminLoginConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 4. Authenticated seller updates their shop profile (first edit)
  const firstShopName = RandomGenerator.name(2);
  const firstDescription = RandomGenerator.paragraph({ sentences: 3 });
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.seller.login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const firstUpdate =
    await api.functional.ecommerceMall.seller.sellers.me.profile.patch(
      sellerConnection,
      {
        body: {
          name: firstShopName,
          description: firstDescription,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Edit profile again with different values (second snapshot)
  const secondShopName = RandomGenerator.name(2);
  const secondDescription = RandomGenerator.paragraph({ sentences: 4 });
  const logoUrl = typia.random<string & tags.Format<"uri">>();
  const secondUpdate =
    await api.functional.ecommerceMall.seller.sellers.me.profile.patch(
      sellerConnection,
      {
        body: {
          name: secondShopName,
          description: secondDescription,
          logoUri: logoUrl as string & tags.MaxLength<80000> & tags.Format<"uri">,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // 6. Retrieve profile snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.seller.sellers.me.profile.snapshots.list(
      sellerConnection,
    );
  typia.assert(snapshotsResponse);
  // 7. Validate response structure
  TestValidator.predicate(
    "response has pagination",
    !!snapshotsResponse.pagination,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(snapshotsResponse.data),
  );
  TestValidator.equals("snapshot count", snapshotsResponse.data.length, 2);
  // 8. Verify each snapshot structure
  for (const snapshot of snapshotsResponse.data) {
    TestValidator.predicate(
      "id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      "shopName exists",
      typeof snapshot.shopName === "string",
    );
    TestValidator.predicate(
      "shopDescription is nullable string",
      snapshot.shopDescription === null ||
        typeof snapshot.shopDescription === "string",
    );
    TestValidator.predicate(
      "logoUrl is nullable string",
      snapshot.logoUrl === null || typeof snapshot.logoUrl === "string",
    );
    TestValidator.predicate(
      "createdAt is ISO 8601",
      !isNaN(Date.parse(snapshot.createdAt)),
    );
  }
  // 9. Verify snapshots are ordered newest first
  TestValidator.predicate(
    "has at least 2 snapshots for order test",
    snapshotsResponse.data.length >= 2,
  );
  const firstSnapshot = snapshotsResponse.data[0];
  const secondSnapshot = snapshotsResponse.data[1];
  const firstCreatedAt = new Date(firstSnapshot.createdAt).getTime();
  const secondCreatedAt = new Date(secondSnapshot.createdAt).getTime();
  TestValidator.predicate(
    "newest snapshot first",
    firstCreatedAt >= secondCreatedAt,
  );
  // 10. Verify snapshot data matches the exact profile state at each edit
  // The first snapshot should have the second update's data (newest)
  TestValidator.equals(
    "newest snapshot has second edit name",
    firstSnapshot.shopName,
    secondShopName,
  );
  TestValidator.equals(
    "newest snapshot has second edit description",
    firstSnapshot.shopDescription,
    secondDescription,
  );
  TestValidator.equals(
    "newest snapshot has second edit logo",
    firstSnapshot.logoUrl,
    logoUrl,
  );
  // The second snapshot should have the first update's data (older)
  TestValidator.equals(
    "older snapshot has first edit name",
    secondSnapshot.shopName,
    firstShopName,
  );
  TestValidator.equals(
    "older snapshot has first edit description",
    secondSnapshot.shopDescription,
    firstDescription,
  );
  TestValidator.equals(
    "older snapshot has no logo initially",
    secondSnapshot.logoUrl,
    null,
  );
}