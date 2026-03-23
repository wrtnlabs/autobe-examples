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
 * Test the authorization boundary where a member attempts to retrieve a block record where they are neither the blocker nor the blocked user.
 *
 * This test validates the privacy protection that prevents users from discovering block relationships between other users, maintaining confidentiality of blocking actions on the platform.
 */
export async function test_api_block_retrieve_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create userA (the blocker)
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_member_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userA);
  // 2. Create userB (the blocked user)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_member_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userB);
  // 3. Create userC (unrelated third party who will attempt unauthorized access)
  const userCConnection: api.IConnection = { host: connection.host };
  const userC = await authorize_member_join(userCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userC);
  // 4. UserA blocks userB
  const block = await generate_random_reddit_clone_member_blocks_create(
    userAConnection,
    {
      body: {
        blocked_user_id: userB.id,
      },
    },
  );
  typia.assert(block);
  // Validate that the block was created correctly
  TestValidator.equals("blocker is userA", block.blocker.id, userA.id);
  TestValidator.equals("blocked user is userB", block.blockedUser.id, userB.id);
  // 5. UserC attempts to retrieve the block (should fail with 403 Forbidden)
  await TestValidator.httpError(
    "unauthorized user cannot view block relationship",
    403,
    async () =>
      await api.functional.redditClone.member.blocks.at(userCConnection, {
        blockId: block.id,
      }),
  );
}
