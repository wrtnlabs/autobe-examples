import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";

export async function test_api_subscription_list_invalid_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to establish context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePassword123!",
        href: "https://community-platform.com/subscribe",
        referrer: "https://community-platform.com/home",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Test with unknown filter field
  await TestValidator.error(
    "invalid filter field should return 400 Bad Request",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.index(
        connection,
        {
          body: '{"unknownField": "invalidValue"}' satisfies ICommunityPlatformSubscription.IRequest,
        },
      );
    },
  );

  // Step 3: Test with incorrect data type for status (string instead of boolean)
  await TestValidator.error(
    "invalid data type for status should return 400 Bad Request",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.index(
        connection,
        {
          body: '{"status": "active"}' satisfies ICommunityPlatformSubscription.IRequest,
        },
      );
    },
  );

  // Step 4: Test with out-of-range value for page (negative number)
  await TestValidator.error(
    "out-of-range page value should return 400 Bad Request",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.index(
        connection,
        {
          body: '{"page": -1}' satisfies ICommunityPlatformSubscription.IRequest,
        },
      );
    },
  );

  // Step 5: Test with out-of-range value for limit (zero)
  await TestValidator.error(
    "out-of-range limit value should return 400 Bad Request",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.index(
        connection,
        {
          body: '{"limit": 0}' satisfies ICommunityPlatformSubscription.IRequest,
        },
      );
    },
  );

  // Step 6: Test with invalid date format for startDateRange
  await TestValidator.error(
    "invalid date format for startDateRange should return 400 Bad Request",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.index(
        connection,
        {
          body: '{"startDateRange": "not-a-date"}' satisfies ICommunityPlatformSubscription.IRequest,
        },
      );
    },
  );

  // Step 7: Test with invalid date format for endDateRange
  await TestValidator.error(
    "invalid date format for endDateRange should return 400 Bad Request",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.index(
        connection,
        {
          body: '{"endDateRange": "invalid-timestamp"}' satisfies ICommunityPlatformSubscription.IRequest,
        },
      );
    },
  );

  // Step 8: Test with malformed JSON string
  await TestValidator.error(
    "malformed JSON string should return 400 Bad Request",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.index(
        connection,
        {
          body: '{"status": true, "limit":}' satisfies ICommunityPlatformSubscription.IRequest, // Malformed JSON
        },
      );
    },
  );

  // Step 9: Test with excessive fields beyond expected structure
  await TestValidator.error(
    "excessive fields should return 400 Bad Request",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.index(
        connection,
        {
          body: '{"status": true, "page": 1, "limit": 10, "extraField1": "value", "extraField2": 123}' satisfies ICommunityPlatformSubscription.IRequest,
        },
      );
    },
  );

  // Step 10: Test with empty request body
  await TestValidator.error(
    "empty request body should return 400 Bad Request",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.index(
        connection,
        {
          body: "{}",
        },
      );
    },
  );
}
