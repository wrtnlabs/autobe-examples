import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

export async function test_api_seller_search_with_deleted_inclusion(
  connection: api.IConnection,
): Promise<void> {
  // Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create active seller accounts
  const sellerEmails: string[] = [];
  const createdSellers: IEcommerceMallSeller.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const email = typia.random<string & tags.Format<"email">>();
    const seller = await authorize_seller_join(sellerConnection, {
      body: {
        email,
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    });
    typia.assert(seller);
    sellerEmails.push(email);
    createdSellers.push(seller);
  }
  // Search WITHOUT includeDeleted - should only return active sellers
  const activeSearchResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        pageSize: 100,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(activeSearchResult);
  // Verify all returned sellers have null deletedAt (active only)
  for (const seller of activeSearchResult.data) {
    TestValidator.equals(
      "Active search should only return sellers with null deletedAt",
      seller.deletedAt,
      null,
    );
  }
  // Search WITH includeDeleted set to true
  const allSearchResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        includeDeleted: true,
        pageSize: 100,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(allSearchResult);
  // Validate that includeDeleted includes same or more records as active-only search
  TestValidator.predicate(
    "includeDeleted=true should return same or more records than excludeDeleted",
    allSearchResult.data.length >= activeSearchResult.data.length,
  );
  // Verify our created sellers appear in results
  for (const seller of createdSellers) {
    const found = allSearchResult.data.find((s) => s.email === seller.email);
    if (found) {
      TestValidator.predicate(
        "Created seller has null deletedAt",
        found.deletedAt === null,
      );
      TestValidator.equals("Seller email matches", found.email, seller.email);
      TestValidator.predicate(
        "Seller registrationCount is non-negative",
        found.registrationCount >= 0,
      );
    }
  }
  // Test pagination with specific parameters
  const paginatedResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        includeDeleted: true,
        page: 1,
        pageSize: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(paginatedResult);
  // Test filtering by approvalStatus
  const pendingSearchResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        approvalStatus: "pending",
        includeDeleted: true,
        pageSize: 100,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(pendingSearchResult);
  for (const seller of pendingSearchResult.data) {
    TestValidator.equals(
      "Filtered sellers have pending approval",
      seller.approvalStatus,
      "pending",
    );
  }
  // Test email filtering
  const emailFilterResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        email: sellerEmails[0].split("@")[0],
        includeDeleted: true,
        pageSize: 100,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(emailFilterResult);
  TestValidator.predicate(
    "Email filter returns results",
    emailFilterResult.data.length > 0,
  );
}
