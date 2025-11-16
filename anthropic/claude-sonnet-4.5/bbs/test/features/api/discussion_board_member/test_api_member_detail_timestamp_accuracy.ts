import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that member detail timestamps are accurate and properly formatted.
 *
 * This test validates the timestamp accuracy and format compliance for member
 * detail records retrieved by moderators. It ensures that created_at and
 * updated_at timestamps follow ISO 8601 format and maintain chronological
 * consistency.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Retrieve the moderator's details via member detail endpoint
 * 3. Validate timestamp format (ISO 8601) via typia.assert()
 * 4. Verify chronological consistency (updated_at >= created_at)
 */
export async function test_api_member_detail_timestamp_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Retrieve member details as moderator
  const memberDetail: IDiscussionBoardMember =
    await api.functional.discussionBoard.moderator.members.at(connection, {
      memberId: moderator.id,
    });
  typia.assert(memberDetail);

  // Step 3: Verify chronological consistency
  const createdAtDate = new Date(memberDetail.created_at);
  const updatedAtDate = new Date(memberDetail.updated_at);

  TestValidator.predicate(
    "updated_at is greater than or equal to created_at",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );
}
