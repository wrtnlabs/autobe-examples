import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";
import { generate_random_discussion_board_member_requests_create } from "../../../generate/generate_random_discussion_board_member_requests_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_administrator_request_view_by_super_admin(connection: api.IConnection): Promise<void> {
    // 1. Create super admin actor
    const superAdminConnection: api.IConnection = { host: connection.host };
    await authorize_super_admin_join(superAdminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 10, wordMax: 30 }),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
    });
    // 2. Create member actor
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuthorized = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
        } satisfies IDiscussionBoardMember.IJoin,
    });
    // 3. Member submits an administrator request
    const request = await api.functional.discussionBoard.member.requests.create(memberConnection, {
        body: {
            reason: RandomGenerator.content({ paragraphs: 2, sentenceMin: 5, sentenceMax: 10 }),
            status: "pending",
        } satisfies IDiscussionBoardAdministratorRequest.ICreate,
    });
    typia.assert(request);
    // 4. Super admin approves the administrator request
    const approvedRequest = await api.functional.discussionBoard.superAdmin.requests.approve(superAdminConnection, {
        requestId: request.id,
    });
    typia.assert(approvedRequest);
    // 5. Super admin retrieves the administrator request
    const retrievedRequest = await api.functional.discussionBoard.admin.requests.at(superAdminConnection, {
        requestId: approvedRequest.id,
    });
    typia.assert(retrievedRequest);
    // 6. Validate response
    TestValidator.equals("request id matches original", retrievedRequest.id, request.id);
    TestValidator.equals("request reason matches", retrievedRequest.reason, request.reason);
    TestValidator.equals("request status is approved", retrievedRequest.status, "approved");
    TestValidator.equals("submitter member id matches", retrievedRequest.submitter.id, memberAuthorized.id);
    TestValidator.equals("submitter display name matches", retrievedRequest.submitter.display_name, memberAuthorized.display_name);
    TestValidator.equals("submitter bio matches", retrievedRequest.submitter.bio, memberAuthorized.bio);
    TestValidator.predicate("processor is present for approved request", retrievedRequest.processor !== null && retrievedRequest.processor !== undefined);
    TestValidator.predicate("processed_at timestamp is present", retrievedRequest.processed_at !== null && retrievedRequest.processed_at !== undefined);
    TestValidator.equals("rejection_reason is null for approved request", retrievedRequest.rejection_reason, null);
}