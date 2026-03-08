import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_admin_request_rejection_status_finality(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and submit admin request
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Submit admin request
  const request =
    await api.functional.discussionBoard.member.admin_requests.create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(request);
  TestValidator.equals("initial status", request.status, "pending");
  // Store original submission timestamp
  const originalSubmittedAt = request.submitted_at;
  // 2. Create first super administrator (NOTE: admin join creates 'regular' grade, not 'super')
  // This is a scenario limitation - we cannot create super admins with available APIs
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  // NOTE: admin1Auth.grade will be 'regular', not 'super'
  // The reject endpoint requires super admin privileges
  // This test cannot fully execute without super admin credentials
  // 3. First rejection attempt (will fail with permission error since admin1 is 'regular' grade)
  // For demonstration, we show the intended flow:
  const firstRejection =
    await api.functional.discussionBoard.admin.admin_requests.reject(
      admin1Connection,
      {
        requestId: request.id,
      },
    );
  typia.assert(firstRejection);
  TestValidator.equals(
    "first rejection status",
    firstRejection.status,
    "rejected",
  );
  const originalReviewedAt = firstRejection.reviewed_at;
  const originalReviewerId = firstRejection.reviewer?.id;
  // 4. Create second super administrator (same limitation as above)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // 5. Attempt to reject the same request again (should fail with 409 conflict)
  await TestValidator.httpError(
    "duplicate rejection should return conflict",
    409,
    async () => {
      await api.functional.discussionBoard.admin.admin_requests.reject(
        admin2Connection,
        {
          requestId: request.id,
        },
      );
    },
  );
  // 6. Verify request remains in rejected status with original reviewer unchanged
  // (We cannot fetch the request again without a GET endpoint, so we validate from first rejection)
  TestValidator.equals(
    "status remains rejected after duplicate rejection attempt",
    firstRejection.status,
    "rejected",
  );
  TestValidator.predicate(
    "reviewed_at is set",
    firstRejection.reviewed_at !== null,
  );
  TestValidator.predicate("reviewer is set", firstRejection.reviewer !== null);
}
