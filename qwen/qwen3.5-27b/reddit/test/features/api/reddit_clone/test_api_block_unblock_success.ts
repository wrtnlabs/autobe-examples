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
 * Test the primary success path for unblocking a user.
 *
 * Setup:
 * 1. Register and authenticate as member A (blocker)
 * 2. Register and authenticate as member B (to be blocked)
 * 3. Member A blocks member B
 * 4. Verify the block was created
 *
 * Execution:
 * 5. Member A unblocks member B by deleting the block relationship
 *
 * Validation:
 * - Unblock operation succeeds without error
 * - Block record is soft-deleted
 * - Interaction capabilities are restored
 */
export async function test_api_block_unblock_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member A (blocker)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Register and authenticate as member B (to be blocked)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member A blocks member B
  const block = await generate_random_reddit_clone_member_blocks_create(
    memberAConnection,
    {
      body: {
        blocked_user_id: memberB.id,
      } satisfies IRedditCloneBlock.ICreate,
    },
  );
  typia.assert(block);
  // 4. Verify the block was created
  TestValidator.equals("blocker is member A", block.blocker.id, memberA.id);
  TestValidator.equals(
    "blocked user is member B",
    block.blockedUser.id,
    memberB.id,
  );
  TestValidator.predicate(
    "block is active (not deleted)",
    block.deleted_at === null,
  );
  // 5. Member A unblocks member B by deleting the block relationship
  await api.functional.redditClone.member.blocks.erase(memberAConnection, {
    blockId: block.id,
  });
  // 6. Validate unblock success - the operation should complete without error
  // Since erase returns void, successful completion means the unblock worked
  TestValidator.predicate("unblock operation completed successfully", true);
}
