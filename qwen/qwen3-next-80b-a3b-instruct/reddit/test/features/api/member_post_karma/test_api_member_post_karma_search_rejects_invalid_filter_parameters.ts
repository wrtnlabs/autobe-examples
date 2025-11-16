import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPostKarmaSearchRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostKarmaSearchRequest";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IPageICommunityPlatformPostKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostKarma";

export async function test_api_member_post_karma_search_rejects_invalid_filter_parameters(
  connection: api.IConnection,
) {
  // Register a new member to establish authentication context
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Test 1: Invalid JSON format (malformed string)
  await TestValidator.error("malformed JSON string should reject", async () => {
    await api.functional.communityPlatform.member.karma.post.search(
      connection,
      {
        body: "{page_size: 10,}" satisfies ICommunityPlatformPostKarmaSearchRequest,
      },
    );
  });

  // Test 2: Invalid page_size - negative integer value in JSON string
  await TestValidator.error(
    "negative page_size in JSON string should reject",
    async () => {
      await api.functional.communityPlatform.member.karma.post.search(
        connection,
        {
          body: '{"page_size": -1, "page": 0}' satisfies ICommunityPlatformPostKarmaSearchRequest,
        },
      );
    },
  );

  // Test 3: Invalid page_size - non-integer in JSON string
  await TestValidator.error(
    "non-integer page_size in JSON string should reject",
    async () => {
      await api.functional.communityPlatform.member.karma.post.search(
        connection,
        {
          body: '{"page_size": "invalid", "page": 0}' satisfies ICommunityPlatformPostKarmaSearchRequest,
        },
      );
    },
  );

  // Test 4: Invalid created_at_from - invalid date format
  await TestValidator.error(
    "invalid date format for created_at_from should reject",
    async () => {
      await api.functional.communityPlatform.member.karma.post.search(
        connection,
        {
          body: '{"created_at_from": "not-a-date", "page": 0}' satisfies ICommunityPlatformPostKarmaSearchRequest,
        },
      );
    },
  );

  // Test 5: Invalid created_at_to - invalid date format
  await TestValidator.error(
    "invalid date format for created_at_to should reject",
    async () => {
      await api.functional.communityPlatform.member.karma.post.search(
        connection,
        {
          body: '{"created_at_to": "not-a-date", "page": 0}' satisfies ICommunityPlatformPostKarmaSearchRequest,
        },
      );
    },
  );

  // Test 6: created_at_from after created_at_to
  await TestValidator.error(
    "created_at_from after created_at_to should reject",
    async () => {
      await api.functional.communityPlatform.member.karma.post.search(
        connection,
        {
          body: '{"created_at_from": "2025-12-31T23:59:59Z", "created_at_to": "2024-01-01T00:00:00Z", "page": 0}' satisfies ICommunityPlatformPostKarmaSearchRequest,
        },
      );
    },
  );

  // Test 7: min_karma_change too negative
  await TestValidator.error(
    "min_karma_change too negative should reject",
    async () => {
      await api.functional.communityPlatform.member.karma.post.search(
        connection,
        {
          body: '{"min_karma_change": -1000000, "page": 0}' satisfies ICommunityPlatformPostKarmaSearchRequest,
        },
      );
    },
  );

  // Test 8: max_karma_change too positive
  await TestValidator.error(
    "max_karma_change too positive should reject",
    async () => {
      await api.functional.communityPlatform.member.karma.post.search(
        connection,
        {
          body: '{"max_karma_change": 1000000, "page": 0}' satisfies ICommunityPlatformPostKarmaSearchRequest,
        },
      );
    },
  );

  // Test 9: Invalid order_by value
  await TestValidator.error(
    "invalid order_by value should reject",
    async () => {
      await api.functional.communityPlatform.member.karma.post.search(
        connection,
        {
          body: '{"order_by": "invalid_field", "page": 0}' satisfies ICommunityPlatformPostKarmaSearchRequest,
        },
      );
    },
  );

  // Test 10: Invalid order_direction value
  await TestValidator.error(
    "invalid order_direction value should reject",
    async () => {
      await api.functional.communityPlatform.member.karma.post.search(
        connection,
        {
          body: '{"order_direction": "invalid_dir", "page": 0}' satisfies ICommunityPlatformPostKarmaSearchRequest,
        },
      );
    },
  );

  // Test 11: page_size value that is too large
  await TestValidator.error(
    "excessively large page_size should reject",
    async () => {
      await api.functional.communityPlatform.member.karma.post.search(
        connection,
        {
          body: '{"page_size": 1000000, "page": 0}' satisfies ICommunityPlatformPostKarmaSearchRequest,
        },
      );
    },
  );

  // Test 12: Negative page value
  await TestValidator.error("negative page value should reject", async () => {
    await api.functional.communityPlatform.member.karma.post.search(
      connection,
      {
        body: '{"page_size": 10, "page": -1}' satisfies ICommunityPlatformPostKarmaSearchRequest,
      },
    );
  });

  // Test 13: page value that is too large
  await TestValidator.error(
    "excessively large page value should reject",
    async () => {
      await api.functional.communityPlatform.member.karma.post.search(
        connection,
        {
          body: '{"page_size": 50, "page": 1000000}' satisfies ICommunityPlatformPostKarmaSearchRequest,
        },
      );
    },
  );

  // Test 14: Invalid JSON with unexpected extra property
  await TestValidator.error(
    "extra property in JSON string should reject",
    async () => {
      await api.functional.communityPlatform.member.karma.post.search(
        connection,
        {
          body: '{"page_size": 10, "page": 0, "invalid_property": "extra"}' satisfies ICommunityPlatformPostKarmaSearchRequest,
        },
      );
    },
  );

  // Test 15: Valid request (for contrast)
  // This confirms the system accepts valid inputs
  const response: IPageICommunityPlatformPostKarma =
    await api.functional.communityPlatform.member.karma.post.search(
      connection,
      {
        body: '{"page_size": 10, "page": 0}' satisfies ICommunityPlatformPostKarmaSearchRequest,
      },
    );
  typia.assert(response);
}
