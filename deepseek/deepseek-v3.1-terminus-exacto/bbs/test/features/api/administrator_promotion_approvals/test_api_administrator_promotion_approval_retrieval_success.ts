import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { prepare_random_discussion_board_administrator_promotion_approval } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_approval";

export async function test_api_administrator_promotion_approval_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // User submits promotion request
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(promotionRequest);
  // Create super admin connection and account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // Super admin approves the promotion request
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.approve(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          reviewer_notes: "Approved for testing purposes",
        },
      },
    );
  typia.assert(approvedRequest);
  // Create admin connection and account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Admin retrieves the approval record
  const approvalRecord =
    await api.functional.discussionBoard.admin.administrator_promotion_approvals.at(
      adminConnection,
      {
        approvalId: approvedRequest.id,
      },
    );
  typia.assert(approvalRecord);
  // Validate approval record details
  TestValidator.equals(
    "approval record ID matches",
    approvalRecord.id,
    approvedRequest.id,
  );
  TestValidator.equals(
    "approval status is correct",
    approvalRecord.status,
    "approved",
  );
  TestValidator.notEquals(
    "approval timestamp is set",
    approvalRecord.approved_at,
    null,
  );
  TestValidator.equals(
    "rejection timestamp is null",
    approvalRecord.rejected_at,
    null,
  );
  TestValidator.equals(
    "reviewer notes match",
    approvalRecord.reviewer_notes,
    "Approved for testing purposes",
  );
  TestValidator.equals("user ID matches", approvalRecord.user.id, user.id);
  TestValidator.predicate(
    "reviewer exists",
    approvalRecord.reviewer !== null && approvalRecord.reviewer !== undefined,
  );
  TestValidator.predicate(
    "administrator assignment exists",
    approvalRecord.administrator !== null &&
      approvalRecord.administrator !== undefined,
  );
  // Validate UUID formats
  TestValidator.predicate(
    "ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      approvalRecord.id,
    ),
  );
  TestValidator.predicate(
    "user ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      approvalRecord.user.id,
    ),
  );
  // Validate timestamp formats
  if (approvalRecord.approved_at !== null) {
    TestValidator.predicate(
      "approved_at is valid ISO date",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        approvalRecord.approved_at,
      ),
    );
  }
  TestValidator.predicate(
    "created_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      approvalRecord.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      approvalRecord.updated_at,
    ),
  );
}
