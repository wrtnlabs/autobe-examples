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
 * Test the primary success path for blocking another user.
 * 1. Create and authenticate the blocker user
 * 2. Create and authenticate the blocked user
 * 3. Blocker creates a block relationship against the blocked user
 * 4. Validate the block response contains correct data
 */
export async function test_api_block_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate the blocker user (user who will block)
  const blockerConnection: api.IConnection = { host: connection.host };
  const blocker = await authorize_member_join(blockerConnection, {
    body: {},
  });
  typia.assert(blocker);
  // 2. Create and authenticate the blocked user (user who will be blocked)
  const blockedConnection: api.IConnection = { host: connection.host };
  const blockedUser = await authorize_member_join(blockedConnection, {
    body: {},
  });
  typia.assert(blockedUser);
  // 3. Blocker creates a block relationship against the blocked user
  const block = await generate_random_reddit_clone_member_blocks_create(
    blockerConnection,
    {
      body: {
        blocked_user_id: blockedUser.id,
      },
    },
  );
  typia.assert(block);
  // 4. Validate block response contains correct data
  TestValidator.equals("blocker_id matches", block.blocker.id, blocker.id);
  TestValidator.equals(
    "blocked_user_id matches",
    block.blockedUser.id,
    blockedUser.id,
  );
  TestValidator.equals(
    "blocker username matches",
    block.blocker.username,
    blocker.username,
  );
  TestValidator.equals(
    "blocked user username matches",
    block.blockedUser.username,
    blockedUser.username,
  );
  TestValidator.equals(
    "block is active (deleted_at is null)",
    block.deleted_at,
    null,
  );
}
