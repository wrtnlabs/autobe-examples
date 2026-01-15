import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminSession";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_list_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate multiple test sessions with varied timestamps and durations
  // We'll create sessions with different authAt, expiresAt, and duration values to test sorting
  const baseTime = new Date("2026-01-10T00:00:00Z").getTime();
  const sessionCount = 20;
  const sessionData: ICommunityPlatformAdminSession.ISummary[] = [];
  for (let i = 0; i < sessionCount; i++) {
    const authAt = new Date(baseTime + i * 1000).toISOString();
    const expiresAt = new Date(baseTime + i * 1000 + 3600000).toISOString(); // 1 hour duration
    const duration = 3600; // 1 hour in seconds
    sessionData.push({
      id: typia.random<string & tags.Format<"uuid">>(),
      adminId: typia.random<string & tags.Format<"uuid">>(),
      authStatus: "active",
      sessionId: typia.random<string & tags.Format<"uuid">>(),
      authAt,
      expiresAt,
      duration,
      userAgent: "Mozilla/5.0",
      sessionType: "browser",
      totalRequests: i + 1,
      lastActivityAt: expiresAt,
      createdAt: authAt,
    });
  }
  // Step 3: Test each sort field with ascending and descending order
  const sortFields: Array<"authTime" | "expireTime" | "duration"> = [
    "authTime",
    "expireTime",
    "duration",
  ];
  const sortOrders: Array<"asc" | "desc"> = ["asc", "desc"];
  const pageSize = 5;
  for (const field of sortFields) {
    for (const order of sortOrders) {
      // Step 3.1: Sort the expected data manually for comparison
      const expectedSorted = [...sessionData].sort((a, b) => {
        let aValue, bValue;
        // Map field names to actual property names
        if (field === "authTime") {
          aValue = new Date(a.authAt).getTime();
          bValue = new Date(b.authAt).getTime();
        } else if (field === "expireTime") {
          aValue = new Date(a.expiresAt).getTime();
          bValue = new Date(b.expiresAt).getTime();
        } else {
          // duration
          aValue = a.duration;
          bValue = b.duration;
        }
        // Apply sorting order
        if (order === "asc") {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
      // Step 3.2: Request data from API with the specific sort parameters
      // Test across multiple pages to ensure sorting consistency
      const allSortedResults: ICommunityPlatformAdminSession.ISummary[] = [];
      const totalPages = Math.ceil(sessionCount / pageSize);
      for (let page = 1; page <= totalPages; page++) {
        const response: IPageICommunityPlatformAdminSession.ISummary =
          await api.functional.communityPlatform.admin.admin.sessions.index(
            adminConnection,
            {
              body: {
                page,
                limit: pageSize,
                sortBy: field,
                sortOrder: order,
              } satisfies ICommunityPlatformAdminSession.IRequest,
            },
          );
        typia.assert(response);
        // Add the page's data to our results collection
        allSortedResults.push(...response.data);
      }
      // Step 3.3: Validate that API results match our manually sorted data
      TestValidator.equals(
        `sessions sorted by ${field} in ${order} order should match expected sequence`,
        allSortedResults,
        expectedSorted,
      );
    }
  }
}
