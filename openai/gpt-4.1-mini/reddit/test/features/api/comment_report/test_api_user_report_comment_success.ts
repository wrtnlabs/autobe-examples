import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_report } from "../../../prepare/prepare_random_community_platform_comment_report";
import { generate_random_community_platform_user_comments_create_comment } from "../../../generate/generate_random_community_platform_user_comments_create_comment";
import { generate_random_community_platform_user_reports_comments_report_create_comment_report } from "../../../generate/generate_random_community_platform_user_reports_comments_report_create_comment_report";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_report_comment_success(connection: api.IConnection) {
    // 1. Register user and obtain authorized connection
    const userConnection: api.IConnection = { host: connection.host };
    const userAuthorized = await authorize_user_join(userConnection, {});
    userConnection.headers = { Authorization: userAuthorized.token.access };
    typia.assert(userAuthorized);
    // 2. Create a new comment to be reported
    const comment = await generate_random_community_platform_user_comments_create_comment(userConnection, {});
    typia.assert(comment);
    // 3. Prepare report data with valid description and no explicit reportReasonId
    const reportBody: ICommunityPlatformCommentReport.ICreate = {
        comment_id: comment.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
    };
    // 4. Create the comment report
    const report = await generate_random_community_platform_user_reports_comments_report_create_comment_report(userConnection, {
        params: { commentId: comment.id },
        body: reportBody,
    });
    typia.assert(report);
    // 5. Validate report properties
    TestValidator.equals("report status", report.status, "pending");
    TestValidator.equals("report.comment.id", report.comment.id, comment.id);
    TestValidator.equals("report.reporterUser.id", report.reporterUser.id, userAuthorized.id);
    // 6. Validate report timestamps are present and ISO strings
    TestValidator.predicate("report.createdAt is ISO string", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(report.createdAt));
    TestValidator.predicate("report.updatedAt is ISO string", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(report.updatedAt));
}
