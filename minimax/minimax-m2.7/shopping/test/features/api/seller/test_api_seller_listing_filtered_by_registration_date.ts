import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
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

export async function test_api_seller_listing_filtered_by_registration_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for seller listing access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create sellers with known timestamps
  // Create first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {});
  typia.assert(seller1);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 1100));
  // Create second seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {});
  typia.assert(seller2);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 1100));
  // Create third seller
  const seller3Connection: api.IConnection = { host: connection.host };
  const seller3 = await authorize_seller_join(seller3Connection, {});
  typia.assert(seller3);
  // 3. Get all sellers to find timestamp boundaries
  const allSellersResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {} satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(allSellersResponse);
  // Find the sellers we created and get their timestamps
  const createdSellers = allSellersResponse.data.filter(
    (s) => s.id === seller1.id || s.id === seller2.id || s.id === seller3.id,
  );
  createdSellers.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  // 4. Test filtering with date range that captures only the middle seller
  if (createdSellers.length >= 3) {
    const firstTimestamp = new Date(createdSellers[0].created_at).getTime();
    const secondTimestamp = new Date(createdSellers[1].created_at).getTime();
    const thirdTimestamp = new Date(createdSellers[2].created_at).getTime();
    // Filter range: after first, before third (captures only second seller)
    const fromDate = new Date(firstTimestamp + 100).toISOString();
    const toDate = new Date(thirdTimestamp - 100).toISOString();
    const filteredResponse =
      await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
        body: {
          created_at_from: fromDate,
          created_at_to: toDate,
        } satisfies IEcommerceMallSeller.IRequest,
      });
    typia.assert(filteredResponse);
    // Verify only the middle seller is returned
    TestValidator.equals(
      "filtered count is 1",
      filteredResponse.data.length,
      1,
    );
    TestValidator.equals(
      "middle seller included",
      filteredResponse.data[0]?.id,
      seller2.id,
    );
  }
  // 5. Test boundary conditions - include exact timestamps
  if (createdSellers.length >= 2) {
    const firstTimestamp = new Date(createdSellers[0].created_at).getTime();
    const secondTimestamp = new Date(createdSellers[1].created_at).getTime();
    // Filter from first (inclusive) to second (inclusive)
    const fromDate = new Date(firstTimestamp).toISOString();
    const toDate = new Date(secondTimestamp).toISOString();
    const boundaryResponse =
      await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
        body: {
          created_at_from: fromDate,
          created_at_to: toDate,
        } satisfies IEcommerceMallSeller.IRequest,
      });
    typia.assert(boundaryResponse);
    // Should include at least the two sellers
    const boundarySellers = boundaryResponse.data.filter(
      (s) => s.id === seller1.id || s.id === seller2.id,
    );
    TestValidator.predicate(
      "boundary includes first seller",
      boundarySellers.some((s) => s.id === seller1.id),
    );
    TestValidator.predicate(
      "boundary includes second seller",
      boundarySellers.some((s) => s.id === seller2.id),
    );
  }
  // 6. Test filter that captures all created sellers
  const allCreatedResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        created_at_from: createdSellers[0]!.created_at,
        created_at_to: createdSellers[createdSellers.length - 1]!.created_at,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(allCreatedResponse);
  const allOurSellers = allCreatedResponse.data.filter(
    (s) => s.id === seller1.id || s.id === seller2.id || s.id === seller3.id,
  );
  TestValidator.equals("all created sellers included", allOurSellers.length, 3);
  // 7. Verify pagination metadata reflects filtered count
  if (createdSellers.length >= 3) {
    const someDateRange =
      await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
        body: {
          created_at_from: createdSellers[1]!.created_at,
          created_at_to: createdSellers[1]!.created_at,
          limit: 10,
        } satisfies IEcommerceMallSeller.IRequest,
      });
    typia.assert(someDateRange);
    TestValidator.equals(
      "pagination records matches data length",
      someDateRange.pagination.records,
      someDateRange.data.length,
    );
  }
}
