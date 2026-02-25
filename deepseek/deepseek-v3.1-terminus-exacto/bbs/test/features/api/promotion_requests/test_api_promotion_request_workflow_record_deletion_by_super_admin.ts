import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardAdministratorPromotionRequestWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequestWorkflow";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_administrator_promotion_approval } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_approval";
import { prepare_random_discussion_board_administrator_promotion_request_workflow } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_request_workflow";
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { generate_random_discussion_board_super_admin_promotion_requests_workflows_create } from "../../../generate/generate_random_discussion_board_super_admin_promotion_requests_workflows_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_promotion_request_workflow_record_deletion_by_super_admin(connection: api.IConnection): Promise<void> {
    // 1. Create and authenticate super admin connection
    const superAdminConnection: api.IConnection = { host: connection.host };
    await authorize_super_admin_join(superAdminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
    });

    // 2. Create and authenticate regular user connection
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
            display_name: RandomGenerator.name(),
        } satisfies IDiscussionBoardUser.IJoin,
    });

    // 3. Create promotion request as regular user
    const promotionRequest = await api.functional.discussionBoard.user.promotion_requests.create(userConnection, {
        body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
    });
    typia.assert(promotionRequest);

    // 4. Create workflow transition record as super admin
    const workflowRecord = await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.create(superAdminConnection, {
        requestId: promotionRequest.id,
        body: {
            status: "under_review",
            notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate,
    });
    typia.assert(workflowRecord);

    // 5. Delete the specific workflow record
    await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.erase(superAdminConnection, {
        requestId: promotionRequest.id,
        workflowId: workflowRecord.id,
    });

    // 6. Verify the promotion request still exists after workflow deletion
    // Try to create another workflow record to verify the parent request still exists
    const newWorkflowRecord = await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.create(superAdminConnection, {
        requestId: promotionRequest.id,
        body: {
            status: "approved",
            notes: "Verified parent request integrity after workflow deletion",
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate,
    });
    typia.assert(newWorkflowRecord);

    // 7. Validate business logic - parent request remains functional
    TestValidator.predicate("Promotion request integrity maintained after workflow deletion", newWorkflowRecord.promotionRequest.id === promotionRequest.id);
}