import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestSession";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_guest_sessions_admin_filter_by_ip(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
        ip: null, // Optional, server will derive
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // Step 2: Query for any existing session to extract a real IP pattern
  const initialSessionResponse: IPageICommunityPlatformGuestSession.ISummary =
    await api.functional.communityPlatform.admin.guest.sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformGuestSession.IRequest,
      },
    );
  typia.assert(initialSessionResponse);
  // Validate we got at least one session
  TestValidator.predicate(
    "session exists",
    initialSessionResponse.data.length > 0,
  );
  // Extract IP address from the first session
  const targetSession = initialSessionResponse.data[0];
  typia.assert<string>(targetSession.ip_address); // Validate IP is string
  TestValidator.predicate(
    "session has IP address",
    targetSession.ip_address !== "",
  );
  // Construct a partial IP pattern (first three octets for IPv4)
  const ipParts = targetSession.ip_address.split(".");
  TestValidator.predicate("IP has enough octets", ipParts.length >= 3);
  const partialIpPattern = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
  // Step 3: Make the filtered request using the partial IP pattern
  const filteredResponse: IPageICommunityPlatformGuestSession.ISummary =
    await api.functional.communityPlatform.admin.guest.sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          ip_address: partialIpPattern, // Partial IP pattern matching
        } satisfies ICommunityPlatformGuestSession.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // Step 4: Validate the filtered results
  TestValidator.predicate(
    "filtered sessions exist",
    filteredResponse.data.length > 0,
  );
  // Validate all returned sessions match the IP pattern
  for (const session of filteredResponse.data) {
    typia.assert<string>(session.ip_address); // Ensure type safety
    TestValidator.predicate(
      "session IP matches partial pattern",
      session.ip_address.startsWith(partialIpPattern),
    );
  }
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    filteredResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    filteredResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records",
    filteredResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages",
    filteredResponse.pagination.pages >= 1,
  );
}
