import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistrationSnapshot";
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

export async function test_api_seller_registration_snapshot_filter_by_date_reviewer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin (reviewer) and seller accounts
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Create another admin for reviewer filter testing
  const anotherAdminConnection: api.IConnection = { host: connection.host };
  const anotherAdmin = await authorize_admin_join(anotherAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(anotherAdmin);
  // Create seller and registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  typia.assert(seller);
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // 2. Query snapshots with date range filter
  const now = new Date();
  const fromDate = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const toDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 1 day in future
  const snapshots =
    await api.functional.ecommerceMall.admin.seller_registrations.snapshots.index(
      adminConnection,
      {
        registrationId: (registration as any).id,
        body: {
          registrationId: (registration as any).id,
          createdAtFrom: fromDate,
          createdAtTo: toDate,
          sortBy: "created_at",
          sortDirection: "desc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Validate all snapshots fall within the specified date range
  const fromTimestamp = new Date(fromDate).getTime();
  const toTimestamp = new Date(toDate).getTime();
  for (const snapshot of snapshots.data) {
    const createdAtTimestamp = new Date(snapshot.createdAt).getTime();
    TestValidator.predicate(
      `snapshot ${snapshot.id} createdAt within range`,
      createdAtTimestamp >= fromTimestamp && createdAtTimestamp <= toTimestamp,
    );
  }
  // 4. Test filter by reviewerId
  const filteredByReviewer =
    await api.functional.ecommerceMall.admin.seller_registrations.snapshots.index(
      adminConnection,
      {
        registrationId: (registration as any).id,
        body: {
          registrationId: (registration as any).id,
          reviewerId: anotherAdmin.id,
          sortBy: "created_at",
          sortDirection: "asc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(filteredByReviewer);
  // 5. Test pagination with limit
  const limitedResults =
    await api.functional.ecommerceMall.admin.seller_registrations.snapshots.index(
      adminConnection,
      {
        registrationId: (registration as any).id,
        body: {
          registrationId: (registration as any).id,
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(limitedResults);
  TestValidator.predicate(
    "pagination limit respected",
    limitedResults.data.length <= 5,
  );
  // 6. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    limitedResults.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", limitedResults.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records >= 0",
    limitedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    limitedResults.pagination.pages >= 0,
  );
}
