import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test filtering members by their banned account status.
 *
 * Validates that the banned filter correctly returns:
 * - Only banned members when banned=true
 * - Only active members when banned=false
 * - All members when banned parameter is omitted
 */
export async function test_api_member_filter_banned_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Get banned members only (banned=true)
  const bannedMembers = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: { banned: true } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(bannedMembers);
  // Verify all returned members have banned=true
  TestValidator.predicate(
    "all banned members should have banned=true",
    bannedMembers.data.every((member) => member.banned === true),
  );
  // 2. Get active members only (banned=false)
  const activeMembers = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: { banned: false } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(activeMembers);
  // Verify all returned members have banned=false
  TestValidator.predicate(
    "all active members should have banned=false",
    activeMembers.data.every((member) => member.banned === false),
  );
  // 3. Get all members without banned filter
  const allMembers = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(allMembers);
  // Verify unfiltered results include both banned and active members
  const hasBanned = allMembers.data.some((member) => member.banned === true);
  const hasActive = allMembers.data.some((member) => member.banned === false);
  TestValidator.predicate(
    "unfiltered results should include banned members",
    hasBanned,
  );
  TestValidator.predicate(
    "unfiltered results should include active members",
    hasActive,
  );
}
