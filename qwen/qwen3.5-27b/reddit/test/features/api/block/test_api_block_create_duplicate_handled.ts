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
 * Test duplicate block creation handling.
 *
 * Validates that attempting to block a user who is already blocked returns
 * the existing block record without creating duplicates, ensuring idempotency
 * and data integrity of the block relationship system.
 */
export async function test_api_block_create_duplicate_handled(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create blocker member account
  const blockerConnection: api.IConnection = { host: connection.host };
  const blocker = await authorize_member_join(blockerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(blocker);
  // 2. Create blocked member account
  const blockedConnection: api.IConnection = { host: connection.host };
  const blocked = await authorize_member_join(blockedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(blocked);
  // 3. Create initial block relationship (blocker blocks blocked user)
  const firstBlock = await api.functional.redditClone.member.blocks.create(
    blockerConnection,
    {
      body: {
        blocked_user_id: blocked.id,
      } satisfies IRedditCloneBlock.ICreate,
    },
  );
  typia.assert(firstBlock);
  // 4. Store original created_at timestamp
  const originalCreatedAt = firstBlock.created_at;
  // 5. Attempt to create duplicate block (same blocker, same blocked user)
  const duplicateBlock = await api.functional.redditClone.member.blocks.create(
    blockerConnection,
    {
      body: {
        blocked_user_id: blocked.id,
      } satisfies IRedditCloneBlock.ICreate,
    },
  );
  typia.assert(duplicateBlock);
  // 6. Validate that the duplicate request returns the same block record
  TestValidator.equals("block ID matches", duplicateBlock.id, firstBlock.id);
  // 7. Validate that created_at timestamp remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    duplicateBlock.created_at,
    originalCreatedAt,
  );
  // 8. Validate that blocker and blockedUser references are correct
  TestValidator.equals(
    "blocker ID matches",
    duplicateBlock.blocker.id,
    blocker.id,
  );
  TestValidator.equals(
    "blocked user ID matches",
    duplicateBlock.blockedUser.id,
    blocked.id,
  );
}
