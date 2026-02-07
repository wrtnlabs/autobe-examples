import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_promotion_request } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_request";

/**
 * Test retrieval of an approved promotion request to validate the complete workflow.
 * Verifies that the status field shows 'approved', approved_at timestamp is populated,
 * reviewer information is present, and administrator assignment is created.
 * Validates that rejected_at remains null and all relationship fields are properly populated.
 */
export async function test_api_promotion_request_retrieval_approved_status(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and account
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardUser.IJoin;
  const userAuth = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    { body: userCredentials },
  );
  typia.assert(userAuth);
  // Create promotion request
  const promotionRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 10,
            wordMax: 20,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Create super administrator connection and account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    privilege_level: "super_admin",
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  const superAdminAuth =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      { body: superAdminCredentials },
    );
  typia.assert(superAdminAuth);
  // Approve the promotion request
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved" as const,
          reviewer_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // Create administrator connection and account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(adminAuth);
  // Retrieve the approved promotion request
  const retrievedRequest =
    await api.functional.discussionBoard.admin.promotion_requests.at(
      adminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate the approved status
  TestValidator.equals(
    "status should be approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "approved_at should be populated",
    retrievedRequest.approved_at !== null,
  );
  TestValidator.predicate(
    "rejected_at should be null",
    retrievedRequest.rejected_at === null,
  );
  TestValidator.predicate(
    "reviewer should be present",
    retrievedRequest.reviewer !== null,
  );
  TestValidator.predicate(
    "administrator should be created",
    retrievedRequest.administrator !== null,
  );
  TestValidator.equals(
    "user should match",
    retrievedRequest.user.id,
    userAuth.id,
  );
}
