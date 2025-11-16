import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPreference";

/**
 * Tests updating member direct message access level preferences through all
 * valid states.
 *
 * This test validates that a member can successfully update their
 * allow_direct_messages preference setting through the complete sequence of
 * valid enum states: 'anyone' → 'followers_only' → 'disabled' → 'anyone'. Each
 * state transition is verified to ensure the API correctly processes preference
 * updates and reflects changes in responses.
 *
 * The test workflow:
 *
 * 1. Create a member account for testing
 * 2. Update preferences setting allow_direct_messages to 'followers_only'
 * 3. Verify the change is reflected in the response
 * 4. Update preferences again to 'disabled'
 * 5. Verify the second change is reflected
 * 6. Update preferences back to 'anyone'
 * 7. Verify the final change is reflected
 * 8. Validate all state transitions work correctly
 */
export async function test_api_member_preferences_update_direct_messages_access_levels(
  connection: api.IConnection,
) {
  // Create a member account
  const memberCreated = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: "SecurePass123!",
      ip: "192.168.1.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberCreated);

  const memberId = memberCreated.id;

  // Update 1: Set allow_direct_messages to 'followers_only'
  const updatedPreferences1 =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId,
        body: {
          allow_direct_messages: "followers_only",
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(updatedPreferences1);
  TestValidator.equals(
    "first update should set allow_direct_messages to followers_only",
    updatedPreferences1.allow_direct_messages,
    "followers_only",
  );

  // Update 2: Set allow_direct_messages to 'disabled'
  const updatedPreferences2 =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId,
        body: {
          allow_direct_messages: "disabled",
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(updatedPreferences2);
  TestValidator.equals(
    "second update should set allow_direct_messages to disabled",
    updatedPreferences2.allow_direct_messages,
    "disabled",
  );

  // Update 3: Set allow_direct_messages back to 'anyone'
  const updatedPreferences3 =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId,
        body: {
          allow_direct_messages: "anyone",
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(updatedPreferences3);
  TestValidator.equals(
    "third update should set allow_direct_messages back to anyone",
    updatedPreferences3.allow_direct_messages,
    "anyone",
  );

  // Verify all state transitions were successful
  TestValidator.predicate(
    "all state transitions should have been processed",
    updatedPreferences1.allow_direct_messages === "followers_only" &&
      updatedPreferences2.allow_direct_messages === "disabled" &&
      updatedPreferences3.allow_direct_messages === "anyone",
  );
}
