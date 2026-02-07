import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_tag_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account to establish authentication
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await api.functional.discussionBoard.auth.member.join(
    joinConnection,
    {
      body: {},
    },
  );
  typia.assert(joinOutput);
  // 2. Create authenticated connection - SDK handles token automatically
  const memberConnection: api.IConnection = { host: connection.host };
  // 3. Test tag list retrieval
  const output =
    await api.functional.discussionBoard.member.tags.index(memberConnection);
  typia.assert(output);
  // 4. Validate response structure
  TestValidator.predicate(
    "response has data array",
    Array.isArray(output.data),
  );
  TestValidator.predicate("pagination exists", output.pagination !== undefined);
  // 5. Validate pagination metadata
  TestValidator.equals("page number is 1", output.pagination.current, 1);
  TestValidator.predicate("limit is positive", output.pagination.limit > 0);
  TestValidator.predicate(
    "total records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    output.pagination.pages >= 0,
  );
  // 6. Verify tag summary structure for each item
  for (const tag of output.data) {
    typia.assert(tag);
  }
}
