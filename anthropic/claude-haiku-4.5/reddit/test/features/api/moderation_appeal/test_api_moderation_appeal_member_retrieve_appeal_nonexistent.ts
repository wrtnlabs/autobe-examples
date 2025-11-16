import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_moderation_appeal_member_retrieve_appeal_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "SecurePassword123!",
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(memberResponse);

  // Step 2: Generate a nonexistent appeal UUID
  const nonexistentAppealId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve the nonexistent appeal and verify error handling
  await TestValidator.error(
    "retrieving nonexistent appeal should fail",
    async () => {
      await api.functional.communityPlatform.member.moderationAppeals.at(
        connection,
        {
          appealId: nonexistentAppealId,
        },
      );
    },
  );
}
