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
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_promotion_approval } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_approval";

export async function test_api_promotion_request_workflow_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin authentication credentials
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  // Create super admin connection and join
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Create new authenticated super admin connection for subsequent calls
  const authenticatedSuperAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await api.functional.discussionBoard.auth.superAdmin.login(
    authenticatedSuperAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  // Create user authentication credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(16);
  // Create user connection and join
  const userConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.user.join(userConnection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create new authenticated user connection for subsequent calls
  const authenticatedUserConnection: api.IConnection = {
    host: connection.host,
  };
  await api.functional.discussionBoard.auth.user.login(
    authenticatedUserConnection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies IDiscussionBoardUser.ILogin,
    },
  );
  // User submits promotion request
  const promotionRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      authenticatedUserConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Super admin updates workflow status to 'under_review' with notes
  const workflowUpdate =
    await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.patchByRequestid(
      authenticatedSuperAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "under_review" as const,
          notes: "Additional review required due to recent platform activity",
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.IUpdate,
      },
    );
  typia.assert(workflowUpdate);
  // Validate workflow record
  TestValidator.equals(
    "workflow status should be under_review",
    workflowUpdate.status,
    "under_review",
  );
  TestValidator.equals(
    "workflow notes should match input",
    workflowUpdate.notes,
    "Additional review required due to recent platform activity",
  );
  TestValidator.predicate(
    "workflow should have creation timestamp",
    workflowUpdate.created_at !== null,
  );
  TestValidator.predicate(
    "workflow should link to promotion request",
    workflowUpdate.promotionRequest !== null,
  );
  TestValidator.equals(
    "workflow should reference correct promotion request",
    workflowUpdate.promotionRequest.id,
    promotionRequest.id,
  );
}
