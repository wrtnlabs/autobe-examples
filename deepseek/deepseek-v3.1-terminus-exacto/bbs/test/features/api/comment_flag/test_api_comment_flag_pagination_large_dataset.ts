import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentFlag";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_comment_flag_pagination_large_dataset(connection: api.IConnection): Promise<void> {
    // Create administrator connection
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardAdmin.IJoin,
    });
    // Generate article and comment IDs
    const articleId = typia.random<string & tags.Format<"uuid">>();
    const commentId = typia.random<string & tags.Format<"uuid">>();
    // Test pagination with different page sizes
    const testLimits = [10, 20, 50] as const;
    for (const limit of testLimits) {
        const requestBody = {
            flag_type: undefined,
            status: undefined,
            page: 1,
            limit: limit,
        } satisfies IDiscussionBoardCommentFlag.IRequest;
        const response = await api.functional.discussionBoard.admin.articles.comments.flags.index(adminConnection, {
            articleId,
            commentId,
            body: requestBody,
        });
        typia.assert(response);
        // Validate pagination metadata structure
        TestValidator.equals(`page ${limit} current page`,
            response.pagination.current,
            1,
        );
        TestValidator.equals(
            `page ${limit} limit`,
            response.pagination.limit,
            limit,
        );
        TestValidator.predicate(`page ${limit} records non-negative`,
            response.pagination.records >= 0,
        );
        TestValidator.predicate(
            `page ${limit} pages non-negative`,
            response.pagination.pages >= 0,
        );
        // Validate data structure
        TestValidator.predicate(`page ${limit} data array`,
            Array.isArray(response.data),
        );

        // Validate flag ordering (created_at descending) if data exists
        if (response.data.length > 1) {
            for (let i = 1; i < response.data.length; i++) {
                TestValidator.predicate(
                    `page ${limit} flag ${i} created_at descending`,
                    new Date(response.data[i - 1].created_at) >= new Date(response.data[i].created_at),
                );
            }
        }
        // Validate flag structure for each item
        for (const flag of response.data) {
            typia.assert(flag);
            TestValidator.predicate(`page ${limit} flag has user`,
                flag.user !== undefined && flag.user.id !== undefined,
            );
            TestValidator.predicate(
                `page ${limit} flag has valid created_at`,
                !isNaN(new Date(flag.created_at).getTime()),
            );
        }
    }
    // Test page navigation
    const page2Response = await api.functional.discussionBoard.admin.articles.comments.flags.index(adminConnection, {
        articleId,
        commentId,
        body: {
            flag_type: undefined,
            status: undefined,
            page: 2,
            limit: 20,
        } satisfies IDiscussionBoardCommentFlag.IRequest,
    });
    typia.assert(page2Response);
    TestValidator.equals("page 2 current page", page2Response.pagination.current, 2);
    TestValidator.predicate("page 2 data array", Array.isArray(page2Response.data));
}