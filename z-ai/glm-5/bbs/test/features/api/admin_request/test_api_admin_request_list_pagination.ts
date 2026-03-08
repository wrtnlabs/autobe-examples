import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_admin_request_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://example.com/admin-requests",
      referrer: "https://example.com",
    },
  });
  // 2. Call admin_requests.index with pagination parameters
  const response =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  // 3. Validate response structure - typia.assert performs complete type validation
  typia.assert(response);
  // 4. Verify pagination metadata business logic
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 10);
  TestValidator.predicate("records >= 0", response.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", response.pagination.pages >= 0);
  // 5. Test with different pagination parameters
  const responsePage2 =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "-created_at",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(responsePage2);
  // 6. Verify records are sorted by created_at DESC (newest first)
  if (responsePage2.data.length > 1) {
    for (let i = 0; i < responsePage2.data.length - 1; i++) {
      const current = new Date(responsePage2.data[i].created_at).getTime();
      const next = new Date(responsePage2.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "records sorted by created_at DESC",
        current >= next,
      );
    }
  }
}
