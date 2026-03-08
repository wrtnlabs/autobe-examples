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
 * Test the primary success path for retrieving administrator accounts with default pagination.
 * A super administrator should be able to authenticate and retrieve the paginated list of all administrator accounts.
 * The response should include pagination metadata (current page, limit, total records, total pages) and an array of admin summaries
 * containing id, email, display_name, grade, and created_at. Verify that soft-deleted administrators are excluded from results.
 * The default sorting should be by created_at in descending order (newest first).
 */
export async function test_api_admin_list_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  // 2. Create additional admin accounts for pagination testing
  const adminConnection1: api.IConnection = { host: connection.host };
  const adminAuth1 = await authorize_admin_join(adminConnection1, {
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
  typia.assert(adminAuth1);
  const adminConnection2: api.IConnection = { host: connection.host };
  const adminAuth2 = await authorize_admin_join(adminConnection2, {
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
  typia.assert(adminAuth2);
  // 3. Retrieve admin list with default pagination
  const adminList = await api.functional.discussionBoard.admin.admins.index(
    superAdminConnection,
    {
      body: {} satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(adminList);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    adminList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    adminList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    adminList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    adminList.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records equals data length",
    adminList.pagination.records === adminList.data.length,
  );
  // 5. Validate admin summaries structure
  TestValidator.predicate("has at least one admin", adminList.data.length > 0);
  adminList.data.forEach((admin, index) => {
    TestValidator.predicate(`admin ${index} has id`, admin.id !== undefined);
    TestValidator.predicate(
      `admin ${index} has email`,
      admin.email !== undefined,
    );
    TestValidator.predicate(
      `admin ${index} has display_name`,
      admin.display_name !== undefined,
    );
    TestValidator.predicate(
      `admin ${index} has grade`,
      admin.grade !== undefined,
    );
    TestValidator.predicate(
      `admin ${index} has created_at`,
      admin.created_at !== undefined,
    );
  });
  // 6. Verify sorting by created_at descending (newest first)
  if (adminList.data.length > 1) {
    for (let i = 0; i < adminList.data.length - 1; i++) {
      const current = new Date(adminList.data[i].created_at).getTime();
      const next = new Date(adminList.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `admin ${i} created_at >= admin ${i + 1} created_at (descending order)`,
        current >= next,
      );
    }
  }
}
