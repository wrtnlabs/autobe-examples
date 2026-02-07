import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_retrieval_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a test member
  const member = api.functional.discussionBoard.members.at.random();
  // 2. Call the API to retrieve member profile
  const memberId = typia.assert<string>(
    (member as any).memberId || (member as any).id
  );
  const output = await api.functional.discussionBoard.members.at(connection, {
    memberId: memberId,
  });
  // 3. Validate the response
  typia.assert(output);
}