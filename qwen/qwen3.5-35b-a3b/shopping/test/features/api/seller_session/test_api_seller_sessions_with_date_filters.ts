import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sessions_with_date_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const joinConnection: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinResponse = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create multiple sessions by logging in multiple times
  const sessions: IEcommerceMallSellerSession.ISummary[] = [];
  // First login
  const login1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_login(login1Connection, {
    body: {
      email: joinResponse.email,
      password: joinPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const sessions1 = await api.functional.ecommerceMall.seller.sessions.index(
    login1Connection,
    {
      body: {} satisfies IEcommerceMallSellerSession.IRequest,
    },
  );
  typia.assert(sessions1);
  if (sessions1.data.length > 0) {
    sessions.push(sessions1.data[0]);
  }
  // Second login
  const login2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_login(login2Connection, {
    body: {
      email: joinResponse.email,
      password: joinPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const sessions2 = await api.functional.ecommerceMall.seller.sessions.index(
    login2Connection,
    {
      body: {} satisfies IEcommerceMallSellerSession.IRequest,
    },
  );
  typia.assert(sessions2);
  if (sessions2.data.length > 0) {
    sessions.push(sessions2.data[0]);
  }
  // Third login
  const login3Connection: api.IConnection = { host: connection.host };
  await authorize_seller_login(login3Connection, {
    body: {
      email: joinResponse.email,
      password: joinPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const sessions3 = await api.functional.ecommerceMall.seller.sessions.index(
    login3Connection,
    {
      body: {} satisfies IEcommerceMallSellerSession.IRequest,
    },
  );
  typia.assert(sessions3);
  if (sessions3.data.length > 0) {
    sessions.push(sessions3.data[0]);
  }
  // 3. Test created_at filter
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24);
  const createdAtFilterDate = pastDate.toISOString();
  const createdAtConnection: api.IConnection = { host: connection.host };
  const createdAtResponse =
    await api.functional.ecommerceMall.seller.sessions.index(
      createdAtConnection,
      {
        body: {
          created_at: {
            gte: createdAtFilterDate,
          } satisfies IEcommerceMallSellerSession.IRequest["created_at"],
        } satisfies IEcommerceMallSellerSession.IRequest,
      },
    );
  typia.assert(createdAtResponse);
  // Verify all returned sessions were created after the filter date
  for (const session of createdAtResponse.data) {
    const sessionCreated = new Date(session.created_at).getTime();
    const filterDate = new Date(createdAtFilterDate).getTime();
    TestValidator.predicate(
      "session created after filter date",
      sessionCreated >= filterDate,
    );
  }
  // Verify total count matches filtered results
  TestValidator.equals(
    "total count matches filtered results",
    createdAtResponse.pagination.records,
    createdAtResponse.data.length,
  );
  // 4. Test expired_at filter
  const expiredAtFilterDate = pastDate.toISOString();
  const expiredAtConnection: api.IConnection = { host: connection.host };
  const expiredAtResponse =
    await api.functional.ecommerceMall.seller.sessions.index(
      expiredAtConnection,
      {
        body: {
          expired_at: {
            gte: expiredAtFilterDate,
          } satisfies IEcommerceMallSellerSession.IRequest["expired_at"],
        } satisfies IEcommerceMallSellerSession.IRequest,
      },
    );
  typia.assert(expiredAtResponse);
  // Verify all returned sessions expired after the filter date
  for (const session of expiredAtResponse.data) {
    const sessionExpired = new Date(session.expired_at).getTime();
    const filterDate = new Date(expiredAtFilterDate).getTime();
    TestValidator.predicate(
      "session expired after filter date",
      sessionExpired >= filterDate,
    );
  }
  // Verify total count matches filtered results
  TestValidator.equals(
    "expired_at total count matches filtered results",
    expiredAtResponse.pagination.records,
    expiredAtResponse.data.length,
  );
  // 5. Test pagination with filters
  const paginatedConnection: api.IConnection = { host: connection.host };
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.sessions.index(
      paginatedConnection,
      {
        body: {
          created_at: {
            gte: createdAtFilterDate,
          } satisfies IEcommerceMallSellerSession.IRequest["created_at"],
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallSellerSession.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "page current is 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit is 5",
    paginatedResponse.pagination.limit,
    5,
  );
  // Verify pages calculation
  const expectedPages =
    paginatedResponse.pagination.records > 0
      ? Math.ceil(
          paginatedResponse.pagination.records /
            paginatedResponse.pagination.limit,
        )
      : 0;
  TestValidator.equals(
    "pages calculation correct",
    paginatedResponse.pagination.pages,
    expectedPages,
  );
  // 6. Test default sort order (created_at descending)
  const sortedConnection: api.IConnection = { host: connection.host };
  const sortedResponse =
    await api.functional.ecommerceMall.seller.sessions.index(sortedConnection, {
      body: {
        created_at: {
          gte: createdAtFilterDate,
        } satisfies IEcommerceMallSellerSession.IRequest["created_at"],
        sort: "created_at",
        order: "desc",
      } satisfies IEcommerceMallSellerSession.IRequest,
    });
  typia.assert(sortedResponse);
  // Verify sessions are sorted by created_at descending
  for (let i = 0; i < sortedResponse.data.length - 1; i++) {
    const current = new Date(sortedResponse.data[i].created_at).getTime();
    const next = new Date(sortedResponse.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "sessions sorted by created_at descending",
      current >= next,
    );
  }
  // 7. Test empty results with correct pagination metadata
  const futureDate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const emptyConnection: api.IConnection = { host: connection.host };
  const emptyResponse =
    await api.functional.ecommerceMall.seller.sessions.index(emptyConnection, {
      body: {
        created_at: {
          gte: futureDate,
        } satisfies IEcommerceMallSellerSession.IRequest["created_at"],
      } satisfies IEcommerceMallSellerSession.IRequest,
    });
  typia.assert(emptyResponse);
  // Verify empty results
  TestValidator.equals(
    "no sessions match future filter",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "total records is 0",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "current page is 0",
    emptyResponse.pagination.current,
    0,
  );
  TestValidator.equals("total pages is 0", emptyResponse.pagination.pages, 0);
}