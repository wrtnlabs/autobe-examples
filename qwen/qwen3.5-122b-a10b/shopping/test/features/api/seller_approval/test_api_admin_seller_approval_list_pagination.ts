import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_admin_seller_approval_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Setup: Create multiple seller accounts (more than default page size of 20)
  const sellerCount = 35; // More than 20 to test pagination
  const sellerEmails: string[] = [];
  const sellerIds: string[] = [];
  await ArrayUtil.asyncForEach(
    ArrayUtil.repeat(sellerCount, (i) => ({
      email: `seller${i}@test.com`,
      shop_name: `Shop ${RandomGenerator.name()}`,
    })),
    async (sellerData, index) => {
      const sellerConnection: api.IConnection = { host: connection.host };
      const sellerAuth = await authorize_seller_join(sellerConnection, {
        body: {
          email: sellerData.email,
          password: "Password1!",
          shop_name: sellerData.shop_name,
          shop_description: RandomGenerator.paragraph({ sentences: 2 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceMallSeller.IJoin,
      });
      typia.assert(sellerAuth);
      sellerEmails.push(sellerData.email);
      sellerIds.push(sellerAuth.id);
    },
  );
  // 3. Test default pagination (page=1, limit=20)
  const page1Response =
    await api.functional.ecommerceMall.admin.sellers.approvals.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 has correct limit",
    page1Response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "page 1 is current page 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 has at least 1 seller",
    page1Response.data.length > 0,
  );
  TestValidator.predicate(
    "page 1 has at most 20 sellers",
    page1Response.data.length <= 20,
  );
  // 4. Test with limit=100 (maximum)
  const maxLimitResponse =
    await api.functional.ecommerceMall.admin.sellers.approvals.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit response has limit 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit has all sellers",
    maxLimitResponse.data.length >= sellerCount,
  );
  // 5. Test pagination across multiple pages
  const allSellers: IEcommerceMallSeller.ISummary[] = [];
  const totalRecords = page1Response.pagination.records;
  const totalPages = Math.ceil(totalRecords / 20);
  for (let page = 1; page <= totalPages; page++) {
    const pageResponse =
      await api.functional.ecommerceMall.admin.sellers.approvals.index(
        adminConnection,
        {
          body: {
            page: page,
            limit: 20,
          } satisfies IEcommerceMallSeller.IRequest,
        },
      );
    typia.assert(pageResponse);
    TestValidator.equals(
      `page ${page} current page`,
      pageResponse.pagination.current,
      page,
    );
    TestValidator.equals(
      `page ${page} limit is 20`,
      pageResponse.pagination.limit,
      20,
    );
    TestValidator.equals(
      `page ${page} total pages`,
      pageResponse.pagination.pages,
      totalPages,
    );
    TestValidator.equals(
      `page ${page} total records`,
      pageResponse.pagination.records,
      totalRecords,
    );
    allSellers.push(...pageResponse.data);
  }
  // 6. Verify no duplicates and all sellers are retrieved
  const uniqueSellerIds = new Set(allSellers.map((s) => s.id));
  TestValidator.equals(
    "no duplicate sellers",
    uniqueSellerIds.size,
    allSellers.length,
  );
  TestValidator.equals(
    "all sellers retrieved",
    uniqueSellerIds.size,
    totalRecords,
  );
  // 7. Verify sorting by created_at descending (newest first)
  for (let i = 1; i < allSellers.length; i++) {
    TestValidator.predicate(
      `seller ${i} created_at is after or equal seller ${i - 1}`,
      allSellers[i].created_at <= allSellers[i - 1].created_at,
    );
  }
  // 8. Test filtering combined with pagination
  const firstSellerEmail = sellerEmails[0];
  const filteredResponse =
    await api.functional.ecommerceMall.admin.sellers.approvals.index(
      adminConnection,
      {
        body: {
          email: firstSellerEmail,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
  typia.assert(filteredResponse);
  TestValidator.equals(
    "filtered result has 1 seller",
    filteredResponse.data.length,
    1,
  );
  TestValidator.equals(
    "filtered seller email matches",
    filteredResponse.data[0].email,
    firstSellerEmail,
  );
  TestValidator.equals(
    "filtered total records is 1",
    filteredResponse.pagination.records,
    1,
  );
}