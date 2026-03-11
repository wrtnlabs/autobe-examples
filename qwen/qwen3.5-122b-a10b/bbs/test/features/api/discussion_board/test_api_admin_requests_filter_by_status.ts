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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

export async function test_api_admin_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "super",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create first member and submit pending request
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member1);
  const request1 =
    await generate_random_discussion_board_member_admin_requests_create(
      member1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(request1);
  // 3. Create second member and submit pending request
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member2);
  const request2 =
    await generate_random_discussion_board_member_admin_requests_create(
      member2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(request2);
  // 4. Create third member and submit pending request (will remain pending)
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member3);
  const request3 =
    await generate_random_discussion_board_member_admin_requests_create(
      member3Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(request3);
  // 5. Super admin approves first request
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.update(
      superAdminConnection,
      {
        adminRequestId: request1.id,
        body: {
          status: "approved",
        } satisfies IDiscussionBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 6. Super admin rejects second request
  const rejectedRequest =
    await api.functional.discussionBoard.admin.admin_requests.update(
      superAdminConnection,
      {
        adminRequestId: request2.id,
        body: {
          status: "rejected",
        } satisfies IDiscussionBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 7. Filter by pending status - should return only request3
  const pendingFilter =
    await api.functional.discussionBoard.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingFilter);
  // Validate pending filter results
  TestValidator.equals("pending count", pendingFilter.data.length, 1);
  TestValidator.equals(
    "pending request ID",
    pendingFilter.data[0].id,
    request3.id,
  );
  TestValidator.predicate(
    "pending reviewer is null",
    pendingFilter.data[0].reviewer === null,
  );
  // 8. Filter by approved status - should return only request1
  const approvedFilter =
    await api.functional.discussionBoard.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(approvedFilter);
  // Validate approved filter results
  TestValidator.equals("approved count", approvedFilter.data.length, 1);
  TestValidator.equals(
    "approved request ID",
    approvedFilter.data[0].id,
    request1.id,
  );
  TestValidator.predicate(
    "approved reviewer is not null",
    approvedFilter.data[0].reviewer !== null,
  );
  // 9. Filter by rejected status - should return only request2
  const rejectedFilter =
    await api.functional.discussionBoard.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedFilter);
  // Validate rejected filter results
  TestValidator.equals("rejected count", rejectedFilter.data.length, 1);
  TestValidator.equals(
    "rejected request ID",
    rejectedFilter.data[0].id,
    request2.id,
  );
  TestValidator.predicate(
    "rejected reviewer is not null",
    rejectedFilter.data[0].reviewer !== null,
  );
  // 10. Filter without status - should return all 3 requests
  const allFilter =
    await api.functional.discussionBoard.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(allFilter);
  TestValidator.equals("all requests count", allFilter.data.length, 3);
}
