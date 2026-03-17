import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallActorType";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test administrator queries authentication sessions with cursor-based pagination.
 *
 * Scenario:
 * 1. Create 7 administrator accounts (each generates a session)
 * 2. Query sessions with limit=5 and no cursor to get first page
 * 3. Verify pagination metadata and record count
 * 4. Extract cursor from last record and fetch next page
 * 5. Verify chronological ordering (newest first, cursor fetches older)
 * 6. Paginate through all pages collecting records
 * 7. Verify total records match pagination metadata
 * 8. Verify no duplicate records across pages
 */
export async function test_api_customer_session_query_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create 7 administrator accounts to generate multiple sessions
  const adminConnections: api.IConnection[] = [];
  for (let i = 0; i < 7; i++) {
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & typia.tags.Format<"url">>(),
        referrer: typia.random<string & typia.tags.Format<"url">>(),
        ip: typia.random<string & typia.tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    });
    adminConnections.push(adminConnection);
  }
  // Use the first admin connection to query sessions
  const queryConnection = adminConnections[0];
  // Step 2: Query first page with limit=5 and no cursor
  const firstPage: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.customer.sessions.index(
      queryConnection,
      {
        body: {
          actorType: "admin",
          limit: 5,
          cursor: null,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(firstPage);
  // Step 3: Verify first page response
  TestValidator.predicate(
    "first page has up to 5 records",
    () => firstPage.data.length <= 5,
  );
  TestValidator.predicate(
    "first page has pagination metadata",
    () => firstPage.pagination !== undefined,
  );
  TestValidator.equals(
    "first page current is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit is 5", firstPage.pagination.limit, 5);
  TestValidator.predicate(
    "total records is at least 7",
    () => firstPage.pagination.records >= 7,
  );
  // Step 4 & 5: Extract cursor from last record and query second page
  if (firstPage.data.length === 5) {
    const lastRecord = firstPage.data[firstPage.data.length - 1];
    const cursor = lastRecord.createdAt;
    const secondPage: IPageIEcommerceMallCustomerSession.ISummary =
      await api.functional.ecommerceMall.customer.sessions.index(
        queryConnection,
        {
          body: {
            actorType: "admin",
            limit: 5,
            cursor: cursor,
          } satisfies IEcommerceMallCustomerSession.IRequest,
        },
      );
    typia.assert(secondPage);
    // Step 6: Verify second page returns older sessions
    TestValidator.predicate(
      "second page has records",
      () => secondPage.data.length > 0,
    );
    if (secondPage.data.length > 0) {
      const firstPageOldestTime = new Date(
        firstPage.data[firstPage.data.length - 1].createdAt,
      ).getTime();
      const secondPageNewestTime = new Date(
        secondPage.data[0].createdAt,
      ).getTime();
      TestValidator.predicate(
        "second page records are older than or equal to first page last record",
        () => secondPageNewestTime <= firstPageOldestTime,
      );
    }
  }
  // Step 7: Paginate through all pages
  const allRecords: IEcommerceMallCustomerSession.ISummary[] = [];
  let currentCursor: string | null = null;
  let pageCount = 0;
  const totalRecords = firstPage.pagination.records;
  do {
    const page: IPageIEcommerceMallCustomerSession.ISummary =
      await api.functional.ecommerceMall.customer.sessions.index(
        queryConnection,
        {
          body: {
            actorType: "admin",
            limit: 5,
            cursor: currentCursor,
          } satisfies IEcommerceMallCustomerSession.IRequest,
        },
      );
    typia.assert(page);
    allRecords.push(...page.data);
    pageCount++;
    // Safety check to prevent infinite loops
    if (pageCount > 20) break;
    // Set cursor for next page if there might be more records
    if (page.data.length > 0) {
      currentCursor = page.data[page.data.length - 1].createdAt;
    }
  } while (allRecords.length < totalRecords);
  // Step 8: Verify total records match
  TestValidator.equals(
    "total records from all pages matches metadata",
    allRecords.length,
    totalRecords,
  );
  // Step 9: Verify no duplicate records
  const recordIds = allRecords.map((record) => record.id);
  const uniqueIds = [...new Set(recordIds)];
  TestValidator.equals(
    "no duplicate session IDs across pages",
    recordIds.length,
    uniqueIds.length,
  );
  // Additional: Verify ordering is consistent (descending by createdAt)
  for (let i = 1; i < allRecords.length; i++) {
    const prevTime = new Date(allRecords[i - 1].createdAt).getTime();
    const currTime = new Date(allRecords[i].createdAt).getTime();
    TestValidator.predicate(
      `record ${i} is older than or equal to record ${i - 1}`,
      () => currTime <= prevTime,
    );
  }
}
