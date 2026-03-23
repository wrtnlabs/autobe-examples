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
 * Test retrieving a block record as the blocked user.
 *
 * This test validates that blocked users can view block records where they are
 * the blocked party, allowing them to understand why they cannot interact with
 * the blocker's content.
 */
export async function test_api_block_retrieve_as_blocked_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create memberX (the blocker)
  const memberXConnection: api.IConnection = { host: connection.host };
  const memberX = await authorize_member_join(memberXConnection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberX);
  // 2. Create memberY (the blocked user)
  const memberYConnection: api.IConnection = { host: connection.host };
  const memberY = await authorize_member_join(memberYConnection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberY);
  // 3. memberX blocks memberY
  const block = await api.functional.redditClone.member.blocks.create(
    memberXConnection,
    {
      body: {
        blocked_user_id: memberY.id,
      } satisfies IRedditCloneBlock.ICreate,
    },
  );
  typia.assert(block);
  // 4. Verify block structure
  TestValidator.equals("blocker is memberX", block.blocker.id, memberX.id);
  TestValidator.equals(
    "blockedUser is memberY",
    block.blockedUser.id,
    memberY.id,
  );
  TestValidator.equals("block is active", block.deleted_at, null);
  TestValidator.predicate("created_at exists", block.created_at.length > 0);
  TestValidator.predicate("updated_at exists", block.updated_at.length > 0);
  // 5. memberY retrieves the block (as blocked user)
  const retrievedBlock = await api.functional.redditClone.member.blocks.at(
    memberYConnection,
    {
      blockId: block.id,
    },
  );
  typia.assert(retrievedBlock);
  // 6. Verify retrieved block matches original
  TestValidator.equals("block ID matches", retrievedBlock.id, block.id);
  TestValidator.equals(
    "blocker ID matches",
    retrievedBlock.blocker.id,
    memberX.id,
  );
  TestValidator.equals(
    "blockedUser ID matches",
    retrievedBlock.blockedUser.id,
    memberY.id,
  );
  TestValidator.equals(
    "blocker username",
    retrievedBlock.blocker.username,
    memberX.username,
  );
  TestValidator.equals(
    "blockedUser username",
    retrievedBlock.blockedUser.username,
    memberY.username,
  );
  TestValidator.equals("deleted_at is null", retrievedBlock.deleted_at, null);
  TestValidator.predicate(
    "created_at valid",
    retrievedBlock.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at valid",
    retrievedBlock.updated_at.length > 0,
  );
}
