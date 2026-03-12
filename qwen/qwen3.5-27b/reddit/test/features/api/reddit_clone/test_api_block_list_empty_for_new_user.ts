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

export async function test_api_block_list_empty_for_new_user(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the edge case where an authenticated member has not blocked any users yet.
   * 1. Register a new member account
   * 2. Query the block list (should be empty)
   * 3. Validate pagination metadata shows empty state correctly
   * 4. Confirm data array is empty but response structure is valid
   */
  // 1. Create a new member account (authenticated connection)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Query the block list with default pagination
  const blockList = await api.functional.redditClone.member.blocks.index(
    memberConnection,
    {
      body: {} satisfies IRedditCloneBlock.IRequest,
    },
  );
  typia.assert(blockList);
  // 3. Validate pagination metadata for empty state
  TestValidator.equals("current page is 1", blockList.pagination.current, 1);
  TestValidator.equals("limit is default 20", blockList.pagination.limit, 20);
  TestValidator.equals("records count is 0", blockList.pagination.records, 0);
  TestValidator.equals("pages count is 0", blockList.pagination.pages, 0);
  // 4. Validate data array is empty
  TestValidator.equals("data array is empty", blockList.data.length, 0);
}
