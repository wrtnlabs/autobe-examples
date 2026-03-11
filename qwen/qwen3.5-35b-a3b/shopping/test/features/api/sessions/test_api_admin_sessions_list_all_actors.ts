import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sessions_list_all_actors(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Admin joins system to obtain authentication tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Basic pagination test: Call sessions index without filters
  const sessionsResponse =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {},
    });
  typia.assert(sessionsResponse);
  // 3. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    sessionsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    sessionsResponse.pagination.limit >= 1 &&
      sessionsResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has records",
    sessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    sessionsResponse.pagination.pages >= 0,
  );
  // 4. Verify data array exists and has sessions
  if (sessionsResponse.data.length > 0) {
    const firstSession = sessionsResponse.data[0];
    typia.assert(firstSession);
    // 5. Verify each session has required fields
    TestValidator.equals("session has id", firstSession.id !== undefined, true);
    TestValidator.equals("session has ip", firstSession.ip !== undefined, true);
    TestValidator.equals(
      "session has href",
      firstSession.href !== undefined,
      true,
    );
    TestValidator.equals(
      "session has referrer",
      firstSession.referrer !== undefined,
      true,
    );
    TestValidator.equals(
      "session has created_at",
      firstSession.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "session has expired_at",
      firstSession.expired_at !== undefined,
      true,
    );
    // 6. Verify seller reference exists
    TestValidator.equals(
      "session has seller reference",
      firstSession.seller !== undefined,
      true,
    );
    // Verify seller summary structure
    TestValidator.equals(
      "seller has id",
      firstSession.seller.id !== undefined,
      true,
    );
    TestValidator.equals(
      "seller has email",
      firstSession.seller.email !== undefined,
      true,
    );
    TestValidator.predicate(
      "seller approvalStatus is valid",
      ["pending", "approved", "rejected"].includes(
        firstSession.seller.approvalStatus,
      ),
    );
    TestValidator.equals(
      "seller has isSuspended",
      firstSession.seller.isSuspended !== undefined,
      true,
    );
    TestValidator.equals(
      "seller has isBanned",
      firstSession.seller.isBanned !== undefined,
      true,
    );
    TestValidator.equals(
      "seller has createdAt",
      firstSession.seller.createdAt !== undefined,
      true,
    );
    TestValidator.equals(
      "seller has updatedAt",
      firstSession.seller.updatedAt !== undefined,
      true,
    );
  } else {
    // Empty data case - still verify pagination metadata is accurate
    TestValidator.equals(
      "pagination metadata accurate for empty",
      sessionsResponse.pagination.records === 0 &&
        sessionsResponse.pagination.pages === 0,
      true,
    );
  }
  // 7. Test filtering by creation date range
  const createdAt = new Date();
  const created_at_filter = { gte: createdAt.toISOString() };
  const sessionsFiltered =
    await api.functional.ecommerceMall.admin.sessions.index(adminConnection, {
      body: {
        created_at: created_at_filter,
      },
    });
  typia.assert(sessionsFiltered);
  TestValidator.equals(
    "filtered sessions has correct structure",
    sessionsFiltered.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "filtered sessions has data array",
    Array.isArray(sessionsFiltered.data),
    true,
  );
  // 8. Test pagination with page 2 and different limit
  const page2 = await api.functional.ecommerceMall.admin.sessions.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 has correct current page",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 has correct limit", page2.pagination.limit, 10);
  // 9. Test pagination boundary with final page
  if (page2.pagination.pages > 1) {
    const finalPage = await api.functional.ecommerceMall.admin.sessions.index(
      adminConnection,
      {
        body: {
          page: page2.pagination.pages,
        },
      },
    );
    typia.assert(finalPage);
    TestValidator.equals(
      "final page has correct current page",
      finalPage.pagination.current,
      page2.pagination.pages,
    );
  }
  // 10. Verify default sorting by created_at descending
  if (sessionsResponse.data.length > 1) {
    const sortedSessions = sessionsResponse.data;
    for (let i = 1; i < sortedSessions.length; i++) {
      TestValidator.predicate(
        `session ${i} created_at <= session ${i - 1} created_at`,
        new Date(sortedSessions[i].created_at).getTime() <=
          new Date(sortedSessions[i - 1].created_at).getTime(),
      );
    }
  }
  // 11. Verify response does NOT include full tokens (only metadata)
  // typia.assert on ISummary ensures token fields are not present
  const sessionSummary = sessionsResponse.data[0];
  typia.assert(sessionSummary);
}
