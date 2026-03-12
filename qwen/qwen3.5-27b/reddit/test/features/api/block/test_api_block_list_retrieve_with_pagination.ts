import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneBlock } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneBlock";
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
 * Test retrieving a user's block list with pagination.
 * 1. Register and authenticate as primary member (blocker)
 * 2. Register a second member (target to be blocked)
 * 3. Create block relationship (primary blocks target)
 * 4. Retrieve paginated block list
 * 5. Validate pagination metadata and block data
 */
export async function test_api_block_list_retrieve_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as primary member (blocker)
  const blockerConnection: api.IConnection = { host: connection.host };
  const blocker = await authorize_member_join(blockerConnection, {
    body: {},
  });
  typia.assert(blocker);
  // 2. Register target member (to be blocked)
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_member_join(targetConnection, {
    body: {},
  });
  typia.assert(target);
  // 3. Create block relationship (blocker blocks target)
  const block = await generate_random_reddit_clone_member_blocks_create(
    blockerConnection,
    {
      body: {
        blocked_user_id: target.id,
      },
    },
  );
  typia.assert(block);
  // 4. Prepare request body for retrieving block list
  const requestBody = {
    page: 1,
    pageSize: 20,
  };
  // 5. Retrieve paginated block list
  const blockList = await api.functional.redditClone.member.blocks.index(
    blockerConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(blockList);
  // 6. Validate pagination metadata
  TestValidator.equals("current page is 1", blockList.pagination.current, 1);
  TestValidator.predicate("limit is positive", blockList.pagination.limit > 0);
  TestValidator.predicate("records >= 1", blockList.pagination.records >= 1);
  TestValidator.predicate("pages >= 1", blockList.pagination.pages >= 1);
  // 7. Validate block data
  TestValidator.predicate("data array not empty", blockList.data.length > 0);
  const firstBlock = blockList.data[0];
  typia.assert(firstBlock);
  // 8. Verify blocked user information
  TestValidator.equals(
    "blocked user id matches target",
    firstBlock.blockedUser.id,
    target.id,
  );
  TestValidator.predicate(
    "blocked user has username",
    firstBlock.blockedUser.username.length > 0,
  );
  TestValidator.predicate(
    "blocked user has display name",
    firstBlock.blockedUser.display_name.length > 0,
  );
  TestValidator.predicate(
    "blocked user has karma",
    typeof firstBlock.blockedUser.karma === "number",
  );
  TestValidator.predicate(
    "blocked user has created_at",
    firstBlock.blockedUser.created_at.length > 0,
  );
  // 9. Verify block has created_at timestamp
  TestValidator.predicate(
    "block has created_at timestamp",
    firstBlock.created_at.length > 0,
  );
}
