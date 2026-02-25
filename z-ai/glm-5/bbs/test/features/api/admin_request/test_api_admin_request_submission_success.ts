import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_admin_requests_create } from "../../../generate/generate_random_discussion_board_user_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test the primary success path where a regular authenticated member
 * successfully submits an administrator privilege request.
 */
export async function test_api_admin_request_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and join
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://google.com",
    },
  });
  typia.assert(user);
  // 2. Create admin request with detailed reason (minimum 50 characters)
  const reasonText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });
  const adminRequest =
    await api.functional.discussionBoard.user.adminRequests.create(
      userConnection,
      {
        body: {
          reason: reasonText,
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 3. Validate response - status should be pending
  TestValidator.equals("status is pending", adminRequest.status, "pending");
  // 4. Validate reason matches
  TestValidator.equals("reason matches", adminRequest.reason, reasonText);
  // 5. Validate requester matches authenticated user
  TestValidator.equals(
    "requester id matches user",
    adminRequest.requester.id,
    user.id,
  );
  TestValidator.equals(
    "requester display name matches user",
    adminRequest.requester.displayName,
    user.displayName,
  );
  TestValidator.equals(
    "requester email matches user",
    adminRequest.requester.email,
    user.email,
  );
  // 6. Validate review fields are null (not reviewed yet)
  TestValidator.equals("reviewer is null", adminRequest.reviewer, null);
  TestValidator.equals("review_notes is null", adminRequest.review_notes, null);
  TestValidator.equals("reviewed_at is null", adminRequest.reviewed_at, null);
}
