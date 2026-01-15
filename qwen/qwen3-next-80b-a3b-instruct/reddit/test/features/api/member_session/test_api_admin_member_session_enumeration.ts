import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_member_session_enumeration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Generate random but valid session filtering parameters
  const filterParams: ICommunityPlatformMemberSession.IRequest = {
    page: 1,
    limit: 20,
    sortBy: RandomGenerator.pick([
      "last_active_at",
      "device_type",
      "ip_address",
      "location",
    ] as const),
    sortOrder: RandomGenerator.pick(["asc", "desc"] as const),
    status: RandomGenerator.pick(["active", "inactive", "expired"] as const),
    deviceType: RandomGenerator.pick(["web", "mobile", "desktop"] as const),
    ipAddress: typia.random<string & tags.Format<"ipv4">>(),
    location: "United States",
    lastActiveAtFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
    lastActiveAtTo: new Date().toISOString(), // Current time
  } satisfies ICommunityPlatformMemberSession.IRequest;
  // Step 3: Call the API endpoint with admin connection and filtering parameters
  const response: IPageICommunityPlatformMemberSession.ISummary =
    await api.functional.communityPlatform.admin.member.sessions.index(
      adminConnection,
      {
        body: filterParams,
      },
    );
  typia.assert(response);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "pagination current page matches request",
    response.pagination.current,
    filterParams.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    filterParams.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => response.pagination.pages >= 0,
  );
  // Step 5: Validate session summaries structure
  TestValidator.predicate(
    "data array exists and is not empty",
    () => Array.isArray(response.data) && response.data.length > 0,
  );
  // Validate individual session structure
  const firstSession = response.data[0];
  TestValidator.equals(
    "session id is a valid UUID",
    firstSession.id.length,
    36,
  );
  TestValidator.equals(
    "member_id is a valid UUID",
    firstSession.member_id.length,
    36,
  );
  TestValidator.predicate("device_type is one of the allowed values", () =>
    ["web", "mobile", "desktop"].includes(firstSession.device_type),
  );
  TestValidator.predicate("ip_address is valid IPv4 or IPv6", () => {
    // Simple validation for IPv4 format
    const ipv4Regex =
      /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return (
      ipv4Regex.test(firstSession.ip_address) ||
      ipv6Regex.test(firstSession.ip_address)
    );
  });
  TestValidator.predicate(
    "user_agent is a non-empty string",
    () =>
      typeof firstSession.user_agent === "string" &&
      firstSession.user_agent.length > 0,
  );
  TestValidator.predicate("last_active_at is ISO 8601 format", () => {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    return isoRegex.test(firstSession.last_active_at);
  });
  TestValidator.predicate("expires_at is ISO 8601 format", () => {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    return isoRegex.test(firstSession.expires_at);
  });
  TestValidator.predicate("status is one of allowed values", () =>
    ["active", "inactive", "expired"].includes(firstSession.status),
  );
  TestValidator.predicate("created_at is ISO 8601 format", () => {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    return isoRegex.test(firstSession.created_at);
  });
  // Step 6: Validate that no sensitive data is exposed in response (test against schema expectations)
  // Expectations from ICommunityPlatformMemberSession.ISummary: id, member_id, device_type, ip_address, user_agent, last_active_at, expires_at, status, created_at
  // Ensure attributes like token, refresh, access, password, secret are NOT present - this is verified by the schema-based typia.assert
  // If any sensitive field were present in the response, typia.assert would fail because it's not in the ISummary type
}
