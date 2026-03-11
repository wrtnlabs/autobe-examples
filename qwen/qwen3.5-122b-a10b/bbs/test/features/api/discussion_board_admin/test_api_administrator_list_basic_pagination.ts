import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator list retrieval with basic pagination.
 * 1. Register super administrator and authenticate
 * 2. Retrieve administrator list with default pagination (page 1, limit 20)
 * 3. Validate pagination metadata structure
 * 4. Verify administrator summaries contain required fields
 * 5. Confirm sorting by created_at in descending order
 */
export async function test_api_administrator_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "super",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve administrator list with default pagination
  const listResponse = await api.functional.discussionBoard.admins.index(
    adminConnection,
    {
      body: {} satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(listResponse);
  // 3. Validate pagination metadata structure
  TestValidator.equals("current page is 1", listResponse.pagination.current, 1);
  TestValidator.equals("limit is 20", listResponse.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    listResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    listResponse.pagination.pages >= 0,
  );
  // 4. Verify administrator summaries contain required fields
  if (listResponse.data.length > 0) {
    const firstAdmin = listResponse.data[0]!;
    TestValidator.predicate(
      "admin has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstAdmin.id,
      ),
    );
    TestValidator.predicate(
      "admin has display_name",
      firstAdmin.display_name.length > 0,
    );
    TestValidator.predicate(
      "admin has valid grade",
      firstAdmin.grade === "regular" || firstAdmin.grade === "super",
    );
    TestValidator.predicate(
      "admin has valid created_at timestamp",
      !isNaN(Date.parse(firstAdmin.created_at)),
    );
    TestValidator.predicate(
      "admin has valid updated_at timestamp",
      !isNaN(Date.parse(firstAdmin.updated_at)),
    );
  }
  // 5. Validate sorting by created_at in descending order
  if (listResponse.data.length > 1) {
    for (let i = 1; i < listResponse.data.length; i++) {
      const prev = listResponse.data[i - 1]!;
      const curr = listResponse.data[i]!;
      TestValidator.predicate(
        `admin[${i - 1}] created_at >= admin[${i}] created_at`,
        Date.parse(prev.created_at) >= Date.parse(curr.created_at),
      );
    }
  }
}
