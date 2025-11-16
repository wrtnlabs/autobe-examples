import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPreference";

/**
 * Test that all direct_messages permission states are correctly persisted and
 * retrieved.
 *
 * This test validates that the allow_direct_messages preference field correctly
 * persists and retrieves all valid permission states: 'anyone',
 * 'followers_only', and 'disabled'. The test creates multiple member accounts,
 * sets different direct message permission levels on each, retrieves their
 * preferences, and verifies that each permission state is correctly returned by
 * the API.
 *
 * Test workflow:
 *
 * 1. Create first member account with email
 * 2. Set allow_direct_messages to 'anyone'
 * 3. Retrieve preferences and verify 'anyone' is persisted
 * 4. Create second member account with different email
 * 5. Set allow_direct_messages to 'followers_only'
 * 6. Retrieve preferences and verify 'followers_only' is persisted
 * 7. Create third member account with different email
 * 8. Set allow_direct_messages to 'disabled'
 * 9. Retrieve preferences and verify 'disabled' is persisted
 * 10. Verify each member's preference is independent and correct
 */
export async function test_api_member_preferences_retrieve_direct_message_permission_states(
  connection: api.IConnection,
) {
  // Create first member with 'anyone' permission
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Set allow_direct_messages to 'anyone' for member1
  const preferences1 =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: member1.id,
        body: {
          allow_direct_messages: "anyone",
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(preferences1);
  TestValidator.equals(
    "member1 direct message permission should be 'anyone'",
    preferences1.allow_direct_messages,
    "anyone",
  );

  // Retrieve and verify member1 preferences
  const retrieved1 =
    await api.functional.communityPlatform.member.members.preferences.at(
      connection,
      {
        memberId: member1.id,
      },
    );
  typia.assert(retrieved1);
  TestValidator.equals(
    "retrieved member1 direct message permission should be 'anyone'",
    retrieved1.allow_direct_messages,
    "anyone",
  );

  // Create second member with 'followers_only' permission
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // Set allow_direct_messages to 'followers_only' for member2
  const preferences2 =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: member2.id,
        body: {
          allow_direct_messages: "followers_only",
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(preferences2);
  TestValidator.equals(
    "member2 direct message permission should be 'followers_only'",
    preferences2.allow_direct_messages,
    "followers_only",
  );

  // Retrieve and verify member2 preferences
  const retrieved2 =
    await api.functional.communityPlatform.member.members.preferences.at(
      connection,
      {
        memberId: member2.id,
      },
    );
  typia.assert(retrieved2);
  TestValidator.equals(
    "retrieved member2 direct message permission should be 'followers_only'",
    retrieved2.allow_direct_messages,
    "followers_only",
  );

  // Create third member with 'disabled' permission
  const member3 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member3);

  // Set allow_direct_messages to 'disabled' for member3
  const preferences3 =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: member3.id,
        body: {
          allow_direct_messages: "disabled",
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(preferences3);
  TestValidator.equals(
    "member3 direct message permission should be 'disabled'",
    preferences3.allow_direct_messages,
    "disabled",
  );

  // Retrieve and verify member3 preferences
  const retrieved3 =
    await api.functional.communityPlatform.member.members.preferences.at(
      connection,
      {
        memberId: member3.id,
      },
    );
  typia.assert(retrieved3);
  TestValidator.equals(
    "retrieved member3 direct message permission should be 'disabled'",
    retrieved3.allow_direct_messages,
    "disabled",
  );

  // Final verification that all preferences are independent
  TestValidator.predicate(
    "all three members have different direct message permissions",
    retrieved1.allow_direct_messages === "anyone" &&
      retrieved2.allow_direct_messages === "followers_only" &&
      retrieved3.allow_direct_messages === "disabled",
  );
}
