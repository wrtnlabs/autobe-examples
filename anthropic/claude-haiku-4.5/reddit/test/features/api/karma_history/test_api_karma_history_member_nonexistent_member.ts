import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

export async function test_api_karma_history_member_nonexistent_member(
  connection: api.IConnection,
) {
  // First, create a member account for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<50> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    { body: memberData },
  );
  typia.assert(authenticatedMember);

  // Generate a non-existent member ID that is a valid UUID format
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve karma history for the non-existent member
  await TestValidator.error(
    "should return error when accessing karma history for non-existent member",
    async () => {
      await api.functional.communityPlatform.member.members.karmaHistory.at(
        connection,
        {
          memberId: nonExistentMemberId,
        },
      );
    },
  );
}
