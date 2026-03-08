import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_ban_records_filter_by_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test filtering by active bans (unbanned_at IS NULL)
  const activeResponse: IPageIDiscussionBoardBanRecord.ISummary =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          unbanned_at_filter: "active",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(activeResponse);
  // Validate all active ban records have unbanned_at = null
  for (const record of activeResponse.data) {
    TestValidator.predicate(
      "active ban record has null unbanned_at",
      record.unbanned_at === null,
    );
  }
  // 3. Test filtering by historical bans (unbanned_at IS NOT NULL)
  const historicalResponse: IPageIDiscussionBoardBanRecord.ISummary =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          unbanned_at_filter: "historical",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(historicalResponse);
  // Validate all historical ban records have unbanned_at != null
  for (const record of historicalResponse.data) {
    TestValidator.predicate(
      "historical ban record has non-null unbanned_at",
      record.unbanned_at !== null,
    );
  }
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination current is positive",
    activeResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    activeResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    activeResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    activeResponse.pagination.pages >= 0,
  );
}
