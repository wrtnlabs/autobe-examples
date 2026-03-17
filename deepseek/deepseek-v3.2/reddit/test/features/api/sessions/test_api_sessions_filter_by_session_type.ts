import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_sessions_filter_by_session_type(
  connection: api.IConnection,
): Promise<void> {
  // Create a member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as a member using the utility function
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Request sessions filtered by session type 'member'
  const response = await api.functional.communityPlatform.member.sessions.index(
    memberConnection,
    {
      body: {
        sessionType: "member",
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies ICommunityPlatformGuestSession.IRequest,
    },
  );
  typia.assert(response);
  // Validate response structure and pagination
  TestValidator.predicate(
    "response has pagination",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(response.data),
  );
  const { pagination, data } = response;
  // Validate pagination metadata
  TestValidator.equals("pagination current is 1", pagination.current, 1);
  TestValidator.equals("pagination limit is 10", pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  // Validate each session object structure (typia.assert already validated types)
  // Additional business logic validation: check that sessions have required fields
  for (const session of data) {
    // typia.assert already performed complete validation including format checks
    // We can still do business logic checks
    TestValidator.predicate("session has guest field", session.guest !== null);
    TestValidator.predicate("session has IP address", session.ip !== undefined);
    TestValidator.predicate("session has href", session.href !== undefined);
  }
  // Note: Cannot directly validate sessionType filtering from response
  // because response type doesn't include sessionType discriminator.
  // The filtering is handled server-side based on the request parameter.
  // This test verifies the API endpoint works correctly with the filter parameter.
}
