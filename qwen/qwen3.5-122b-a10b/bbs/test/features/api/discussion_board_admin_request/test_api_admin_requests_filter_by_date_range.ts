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

export async function test_api_admin_requests_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
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
  // 2. Create three members and submit admin requests at different timestamps
  const memberRequests: IDiscussionBoardAdminRequest[] = [];
  await ArrayUtil.asyncRepeat(3, async (index) => {
    // Create member
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    typia.assert(memberAuth);
    // Submit admin request
    const request =
      await generate_random_discussion_board_member_admin_requests_create(
        memberConnection,
        {
          body: {
            reason: `Request ${index + 1} justification`,
          } satisfies IDiscussionBoardAdminRequest.ICreate,
        },
      );
    typia.assert(request);
    memberRequests.push(request);
    // Wait to create time difference between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  // Sort requests by submitted_at for testing
  memberRequests.sort(
    (a, b) =>
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
  );
  const earliestRequest = memberRequests[0];
  const middleRequest = memberRequests[1];
  const latestRequest = memberRequests[2];
  // 3. Test filtering with submitted_at_gte (get requests from middle onwards)
  const gteFilterDate = new Date(middleRequest.submitted_at);
  const gteResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          submitted_at_gte: gteFilterDate.toISOString(),
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(gteResult);
  TestValidator.equals("gte filter count", gteResult.data.length, 2);
  TestValidator.predicate(
    "gte filter includes middle request",
    gteResult.data.some((r) => r.id === middleRequest.id),
  );
  TestValidator.predicate(
    "gte filter includes latest request",
    gteResult.data.some((r) => r.id === latestRequest.id),
  );
  TestValidator.predicate(
    "gte filter excludes earliest request",
    !gteResult.data.some((r) => r.id === earliestRequest.id),
  );
  // 4. Test filtering with submitted_at_lte (get requests up to middle)
  const lteFilterDate = new Date(middleRequest.submitted_at);
  const lteResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          submitted_at_lte: lteFilterDate.toISOString(),
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(lteResult);
  TestValidator.equals("lte filter count", lteResult.data.length, 2);
  TestValidator.predicate(
    "lte filter includes earliest request",
    lteResult.data.some((r) => r.id === earliestRequest.id),
  );
  TestValidator.predicate(
    "lte filter includes middle request",
    lteResult.data.some((r) => r.id === middleRequest.id),
  );
  TestValidator.predicate(
    "lte filter excludes latest request",
    !lteResult.data.some((r) => r.id === latestRequest.id),
  );
  // 5. Test combined date range filtering
  const rangeStart = new Date(earliestRequest.submitted_at);
  const rangeEnd = new Date(latestRequest.submitted_at);
  const rangeResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          submitted_at_gte: rangeStart.toISOString(),
          submitted_at_lte: rangeEnd.toISOString(),
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(rangeResult);
  TestValidator.equals("range filter count", rangeResult.data.length, 3);
  // 6. Verify sorting order (DESC by submitted_at)
  for (let i = 0; i < rangeResult.data.length - 1; i++) {
    TestValidator.predicate(
      `sorting check ${i}`,
      new Date(rangeResult.data[i].submitted_at).getTime() >=
        new Date(rangeResult.data[i + 1].submitted_at).getTime(),
    );
  }
  // 7. Test filtering with narrow range (only middle request)
  const middleStart = new Date(middleRequest.submitted_at);
  const middleEnd = new Date(middleRequest.submitted_at);
  // Add 1 second to ensure inclusion with some buffer
  middleEnd.setSeconds(middleEnd.getSeconds() + 1);
  const narrowResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          submitted_at_gte: middleStart.toISOString(),
          submitted_at_lte: middleEnd.toISOString(),
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(narrowResult);
  TestValidator.equals(
    "narrow range filter count",
    narrowResult.data.length,
    1,
  );
  TestValidator.predicate(
    "narrow range includes middle request",
    narrowResult.data.some((r) => r.id === middleRequest.id),
  );
}
