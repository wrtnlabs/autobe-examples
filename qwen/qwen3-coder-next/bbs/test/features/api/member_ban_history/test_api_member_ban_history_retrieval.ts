import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_ban_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      // IDiscussionBoardMember.IJoin has no required fields currently
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Retrieve ban history for the authenticated member
  const banHistory =
    await api.functional.discussionBoard.member.members.me.bans.index(
      memberConnection,
    );
  typia.assert(banHistory);
  // 3. Validate response structure
  TestValidator.equals("pagination exists", banHistory.pagination, {
    current: banHistory.pagination.current,
    limit: banHistory.pagination.limit,
    records: banHistory.pagination.records,
    pages: banHistory.pagination.pages,
  });
  // 4. Validate ban records structure
  if (banHistory.data.length > 0) {
    for (const ban of banHistory.data) {
      // IDiscussionBoardBansBanRecord.ISummary has no required fields currently
      typia.assert(ban);
    }
  }
  // 5. Test with pagination parameters
  const paginatedBanHistory =
    await api.functional.discussionBoard.member.members.me.bans.index(
      memberConnection,
    );
  typia.assert(paginatedBanHistory);
  // 6. Verify pagination consistency
  TestValidator.predicate("pagination valid", () => {
    const pagination = paginatedBanHistory.pagination;
    return (
      pagination.current >= 1 &&
      pagination.limit >= 0 &&
      pagination.records >= 0 &&
      pagination.pages >= 0
    );
  });
}
