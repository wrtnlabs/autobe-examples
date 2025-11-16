import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPreference";

export async function test_api_member_preferences_update_media_and_link_behavior(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.predicate(
    "member should be created with valid ID",
    typeof member.id === "string" && member.id.length > 0,
  );

  // Step 2: Update member preferences with media and link behavior settings
  const updatedPreferences =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: member.id,
        body: {
          expand_inline_media: false,
          open_links_new_tab: false,
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(updatedPreferences);

  // Step 3: Verify the response contains the updated values
  TestValidator.equals(
    "expand_inline_media should be false",
    updatedPreferences.expand_inline_media,
    false,
  );
  TestValidator.equals(
    "open_links_new_tab should be false",
    updatedPreferences.open_links_new_tab,
    false,
  );

  // Step 4: Validate that preferences have the correct member ID association
  TestValidator.equals(
    "preferences should belong to the created member",
    updatedPreferences.community_platform_member_id,
    member.id,
  );
}
