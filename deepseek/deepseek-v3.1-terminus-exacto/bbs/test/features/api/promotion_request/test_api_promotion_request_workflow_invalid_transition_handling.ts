import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardAdministratorPromotionRequestWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequestWorkflow";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_promotion_requests_workflows_create } from "../../../generate/generate_random_discussion_board_super_admin_promotion_requests_workflows_create";
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_promotion_approval } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_approval";
import { prepare_random_discussion_board_administrator_promotion_request_workflow } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_request_workflow";

export async function test_api_promotion_request_workflow_invalid_transition_handling(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Create a promotion request
  const promotionRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }) satisfies string & tags.MinLength<50> & tags.MaxLength<500>,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Test 1: Attempt to skip 'under_review' step by going directly to 'approved'
  await TestValidator.error(
    "should reject skipping under_review step",
    async () => {
      await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.create(
        superAdminConnection,
        {
          requestId: promotionRequest.id,
          body: {
            status: "approved",
            notes: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate,
        },
      );
    },
  );
  // Test 2: Create a valid 'under_review' transition first
  const underReviewWorkflow =
    await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.create(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "under_review",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate,
      },
    );
  typia.assert(underReviewWorkflow);
  // Test 3: Attempt to move backwards from 'under_review' to 'pending'
  await TestValidator.error(
    "should reject moving backwards to pending",
    async () => {
      await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.create(
        superAdminConnection,
        {
          requestId: promotionRequest.id,
          body: {
            status: "pending",
            notes: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate,
        },
      );
    },
  );
  // Test 4: Attempt invalid status value
  await TestValidator.error("should reject invalid status value", async () => {
    await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.create(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "invalid_status",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies any,
      },
    );
  });
  // Test 5: Attempt with invalid UUID format
  await TestValidator.error(
    "should reject invalid requestId format",
    async () => {
      await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.create(
        superAdminConnection,
        {
          requestId: "invalid-uuid-format",
          body: {
            status: "under_review",
            notes: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate,
        },
      );
    },
  );
  // Test 6: Verify original promotion request integrity
  const retrievedRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }) satisfies string & tags.MinLength<50> & tags.MaxLength<500>,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(retrievedRequest);
  TestValidator.equals(
    "promotion request status unchanged",
    retrievedRequest.status,
    "pending",
  );
}
