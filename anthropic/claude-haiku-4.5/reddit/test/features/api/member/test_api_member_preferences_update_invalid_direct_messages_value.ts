import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPreference";

export async function test_api_member_preferences_update_invalid_direct_messages_value(
  connection: api.IConnection,
) {
  // 1. Create a member account for testing
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        ip: "127.0.0.1",
        href: "http://localhost:3000/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAccount);

  const memberId: string & tags.Format<"uuid"> = memberAccount.id;

  // 2. Test updating allow_direct_messages with each valid enum value
  const validDirectMessageValues = [
    "anyone",
    "followers_only",
    "disabled",
  ] as const;

  for (const validValue of validDirectMessageValues) {
    const updateResult: ICommunityPlatformMemberPreference =
      await api.functional.communityPlatform.member.members.preferences.update(
        connection,
        {
          memberId: memberId,
          body: {
            allow_direct_messages: validValue,
          } satisfies ICommunityPlatformMemberPreference.IUpdate,
        },
      );
    typia.assert(updateResult);

    // Verify the preference was updated to the correct value
    TestValidator.equals(
      `allow_direct_messages should be set to ${validValue}`,
      updateResult.allow_direct_messages,
      validValue,
    );
  }
}
