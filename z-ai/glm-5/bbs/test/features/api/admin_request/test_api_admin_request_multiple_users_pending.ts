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
 * Test that multiple different users can each have their own pending admin request simultaneously.
 *
 * This validates an important business rule: while a single user cannot have multiple
 * pending requests, the system allows multiple different users to each have one pending
 * request at the same time.
 *
 * Setup:
 * 1. Create and authenticate first user via join
 * 2. Submit first admin request
 * 3. Create and authenticate second user via join (different user context)
 * 4. Submit second admin request
 *
 * Validation points:
 * - First admin request should succeed with status 'pending'
 * - Second admin request should also succeed with status 'pending'
 * - Each request should have its own unique id
 * - Each request should reference its respective requester
 * - The system should maintain both pending requests independently without conflict
 * - This confirms the unique constraint is per-user, not system-wide
 */
export async function test_api_admin_request_multiple_users_pending(
  connection: api.IConnection,
): Promise<void> {
  // First user setup
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {});
  typia.assert(firstUser);
  // First admin request
  const firstAdminRequest =
    await generate_random_discussion_board_user_admin_requests_create(
      firstUserConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 10 }),
        },
      },
    );
  typia.assert(firstAdminRequest);
  // Second user setup
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {});
  typia.assert(secondUser);
  // Second admin request
  const secondAdminRequest =
    await generate_random_discussion_board_user_admin_requests_create(
      secondUserConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 10 }),
        },
      },
    );
  typia.assert(secondAdminRequest);
  // Validation: both requests should have 'pending' status
  TestValidator.equals(
    "first request status is pending",
    firstAdminRequest.status,
    "pending",
  );
  TestValidator.equals(
    "second request status is pending",
    secondAdminRequest.status,
    "pending",
  );
  // Validation: each request should have unique id
  TestValidator.notEquals(
    "request IDs are unique",
    firstAdminRequest.id,
    secondAdminRequest.id,
  );
  // Validation: each request references its respective requester
  TestValidator.equals(
    "first request requester matches first user",
    firstAdminRequest.requester.id,
    firstUser.id,
  );
  TestValidator.equals(
    "second request requester matches second user",
    secondAdminRequest.requester.id,
    secondUser.id,
  );
  // Validation: requester IDs should be different
  TestValidator.notEquals(
    "requester IDs are different",
    firstAdminRequest.requester.id,
    secondAdminRequest.requester.id,
  );
  // Validation: both requests should have no reviewer (still pending)
  TestValidator.equals(
    "first request has no reviewer",
    firstAdminRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "second request has no reviewer",
    secondAdminRequest.reviewer,
    null,
  );
}
