import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test report history endpoint when authenticated member has never submitted any reports.
 *
 * Test Steps:
 * 1. Authenticate as a new member via POST /redditClone/auth/member/join (fresh account with no reports)
 * 2. Call PATCH /redditClone/member/reports/history with empty body
 * 3. Verify response returns empty data array: []
 * 4. Verify pagination metadata shows records=0, pages=0
 * 5. Verify current page remains 1
 *
 * Expected: Response successfully returns empty array with proper pagination metadata indicating no reports found. Status code 200.
 */
export async function test_api_report_history_empty_state_for_new_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member with no report history
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Call PATCH /redditClone/member/reports/history with empty body
  const response =
    await api.functional.redditClone.member.reports.history.index(
      memberConnection,
      {
        body: {} satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(response);
  // 3. Verify response returns empty data array
  TestValidator.equals("data array should be empty", response.data, []);
  // 4. Verify pagination metadata shows records=0, pages=0
  TestValidator.equals("records should be 0", response.pagination.records, 0);
  TestValidator.equals("pages should be 0", response.pagination.pages, 0);
  // 5. Verify current page remains 1
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
}
