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

export async function test_api_seller_listing_search_by_email_and_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create test sellers with known email patterns for search testing
  const sellerPrefixes = ["aaa", "bbb", "ccc"] as const;
  const password = "TestPassword123!";
  const createdSellers: IEcommerceMallSeller.IAuthorized[] = [];
  for (const prefix of sellerPrefixes) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
      body: {
        email: `${prefix}@test-search.com` as string & tags.Format<"email">,
        password: password as string & tags.Format<"password">,
      },
    });
    typia.assert(seller);
    createdSellers.push(seller);
  }
  // 3. Test searching sellers by email partial match
  const emailSearchResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        search: "aaa@test",
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(emailSearchResult);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current",
    emailSearchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit",
    emailSearchResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(emailSearchResult.data),
  );
  // Validate filtered result contains only matching email
  for (const seller of emailSearchResult.data) {
    TestValidator.predicate(
      "email contains search term",
      seller.email.includes("aaa@test"),
    );
  }
  // 4. Test searching sellers by sellerName partial match (search may return sellers with matching profile names)
  const nameSearchResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        sellerName: "Test",
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(nameSearchResult);
  // Validate filtered result contains only matching shop names (if any exist)
  for (const seller of nameSearchResult.data) {
    TestValidator.predicate(
      "profile name contains search term",
      seller.profile.name.includes("Test"),
    );
  }
  // 5. Test combined search (email AND sellerName)
  const combinedSearchResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        search: "bbb",
        sellerName: "Test",
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(combinedSearchResult);
  // Validate combined filter works - if results exist, they must match both criteria
  for (const seller of combinedSearchResult.data) {
    TestValidator.predicate("email contains bbb", seller.email.includes("bbb"));
    TestValidator.predicate(
      "name contains Test",
      seller.profile.name.includes("Test"),
    );
  }
  // 6. Test pagination with page and limit parameters
  const paginatedResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(paginatedResult);
  // Validate pagination metadata
  TestValidator.equals("page 1 current", paginatedResult.pagination.current, 1);
  TestValidator.equals("limit 2", paginatedResult.pagination.limit, 2);
  TestValidator.predicate(
    "total records >= created sellers",
    paginatedResult.pagination.records >= createdSellers.length,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    paginatedResult.pagination.pages >= 1,
  );
  // 7. Test second page if more pages exist
  if (paginatedResult.pagination.pages > 1) {
    const secondPageResult =
      await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallSeller.IRequest,
      });
    typia.assert(secondPageResult);
    TestValidator.equals(
      "page 2 current",
      secondPageResult.pagination.current,
      2,
    );
  }
  // 8. Validate seller summary structure
  for (const seller of emailSearchResult.data) {
    TestValidator.predicate("has id", seller.id !== undefined);
    TestValidator.predicate("has email", seller.email !== undefined);
    TestValidator.predicate(
      "has approval_status",
      seller.approval_status !== undefined,
    );
    TestValidator.predicate("has created_at", seller.created_at !== undefined);
    TestValidator.predicate("has profile", seller.profile !== undefined);
    TestValidator.predicate("profile has id", seller.profile.id !== undefined);
    TestValidator.predicate(
      "profile has name",
      seller.profile.name !== undefined,
    );
  }
  // 9. Validate results are ordered by created_at descending (newest first)
  const allSellersResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 100 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(allSellersResult);
  for (let i = 0; i < allSellersResult.data.length - 1; i++) {
    const current = new Date(allSellersResult.data[i].created_at);
    const next = new Date(allSellersResult.data[i + 1].created_at);
    TestValidator.predicate(
      "ordered by created_at descending",
      current >= next,
    );
  }
}
