import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBlock } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBlock";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_blocks_create } from "../../../generate/generate_random_reddit_clone_member_blocks_create";
import { prepare_random_reddit_clone_block } from "../../../prepare/prepare_random_reddit_clone_block";

/**
 * Test retrieving a block record as the blocker (user who created the block).
 *
 * This test validates the primary success path where an authenticated member
 * retrieves a block record they created. The test creates two member accounts,
 * has one member block the other, then retrieves the block record to verify
 * all fields are correctly populated including blocker/blocked user summaries
 * and timestamps.
 */
export async function test_api_block_retrieve_as_blocker(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create memberA (the blocker)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {},
  });
  typia.assert(memberA);
  // 2. Create memberB (the blocked user)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {},
  });
  typia.assert(memberB);
  // 3. memberA blocks memberB
  const block = await generate_random_reddit_clone_member_blocks_create(
    memberAConnection,
    {
      body: {
        blocked_user_id: memberB.id,
      },
    },
  );
  typia.assert(block);
  // 4. Retrieve the block as memberA (the blocker)
  const retrievedBlock = await api.functional.redditClone.member.blocks.at(
    memberAConnection,
    {
      blockId: block.id,
    },
  );
  typia.assert(retrievedBlock);
  // 5. Validate block structure and content
  TestValidator.equals("block ID matches", retrievedBlock.id, block.id);
  TestValidator.equals(
    "blocker ID is memberA",
    retrievedBlock.blocker.id,
    memberA.id,
  );
  TestValidator.equals(
    "blocked user ID is memberB",
    retrievedBlock.blockedUser.id,
    memberB.id,
  );
  TestValidator.equals(
    "blocker username matches",
    retrievedBlock.blocker.username,
    memberA.username,
  );
  TestValidator.equals(
    "blocked user username matches",
    retrievedBlock.blockedUser.username,
    memberB.username,
  );
  TestValidator.equals(
    "deleted_at is null (active block)",
    retrievedBlock.deleted_at,
    null,
  );
  TestValidator.predicate("created_at is valid datetime", () => {
    const date = new Date(retrievedBlock.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid datetime", () => {
    const date = new Date(retrievedBlock.updated_at);
    return !isNaN(date.getTime());
  });
}
