import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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

export async function test_api_admin_ban_records_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Search ban records without filters (basic search)
  const searchResult =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current field",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit field",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records field",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages field",
    searchResult.pagination.pages >= 0,
  );
  // Validate pagination calculation consistency
  if (searchResult.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      searchResult.pagination.records / searchResult.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation matches records and limit",
      searchResult.pagination.pages,
      expectedPages,
    );
  } else {
    // When limit is 0, pages should be 0
    TestValidator.equals(
      "pages should be 0 when limit is 0",
      searchResult.pagination.pages,
      0,
    );
  }
  // Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(searchResult.data));
  // Validate ban record structure if data exists
  if (searchResult.data.length > 0) {
    const banRecord = searchResult.data[0];
    // Validate that ban record has required fields (business logic validation)
    TestValidator.predicate(
      "ban record has non-empty ban reason",
      banRecord.ban_reason.length > 0,
    );
    TestValidator.predicate(
      "ban record has valid status",
      ["active", "expired", "revoked"].includes(banRecord.ban_status),
    );
    // Validate ban duration consistency with expiration
    if (banRecord.ban_duration_days !== null) {
      TestValidator.predicate(
        "temporary ban has positive duration",
        banRecord.ban_duration_days > 0,
      );
    }
    // Permanent bans should have null expiration
    if (banRecord.ban_duration_days === null) {
      TestValidator.equals(
        "permanent ban has null expiration",
        banRecord.expires_at,
        null,
      );
    }
  }
}
