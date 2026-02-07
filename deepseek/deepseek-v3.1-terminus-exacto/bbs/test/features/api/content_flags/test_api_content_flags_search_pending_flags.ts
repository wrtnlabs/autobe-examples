import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the primary workflow where an administrator searches for pending content flags that require immediate attention.
 * 1. Administrator authenticates using join endpoint
 * 2. Administrator searches for flags with status 'pending'
 * 3. Verify that only flags with pending status are returned
 * 4. Validate pagination works correctly
 * 5. Check response includes essential flag information
 */
export async function test_api_content_flags_search_pending_flags(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using join
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
  // Search for pending content flags
  const response =
    await api.functional.discussionBoard.admin.content_flags.index(
      adminConnection,
      {
        body: {
          status: "pending" satisfies
            | "pending"
            | "under investigation"
            | "resolved"
            | "dismissed"
            | null
            | undefined,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit within range",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    response.pagination.pages >= 0,
  );
  // Validate flag data structure
  if (response.data.length > 0) {
    const flag = response.data[0];
    TestValidator.predicate("flag has ID", flag.id !== undefined);
    TestValidator.predicate("flag has reason", flag.flag_reason !== undefined);
    TestValidator.equals("flag status is pending", flag.status, "pending");
    TestValidator.predicate(
      "flag has creation timestamp",
      flag.created_at !== undefined,
    );
    TestValidator.predicate(
      "flag has reporter ID",
      flag.reporter_user_id !== undefined,
    );
  }
}