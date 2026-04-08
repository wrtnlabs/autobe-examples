import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_comments_empty_result(connection: api.IConnection): Promise<void> {
    // 1. Create NEW member (no existing comments) using utility function
    const joinConnection: api.IConnection = { host: connection.host };
    const auth = await authorize_member_join(joinConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
            href: typia.random<(string & tags.Format<"uri">)>(),
            referrer: typia.random<(string & tags.Format<"uri">)>(),
        } satisfies IRedditPlatformMember.IJoin,
    });
    typia.assert(auth);
    // 2. Use member connection for comments endpoint (connection.headers is now set)
    const memberConnection: api.IConnection = { host: connection.host };
    memberConnection.headers = { Authorization: `Bearer ${auth.token.access}` };
    const commentsResult: IPageIRedditPlatformComment.ISummary = await api.functional.redditPlatform.member.users.me.comments.index(memberConnection, {
        body: {
            page: 1,
            limit: 20,
        } satisfies IRedditPlatformComment.IRequest,
    });
    typia.assert(commentsResult);
    // 3. Verify data array is empty
    TestValidator.equals("data array is empty", commentsResult.data.length, 0);
    // 4. Verify pagination metadata
    TestValidator.equals("current page is 1", commentsResult.pagination.current, 1);
    TestValidator.equals("default limit is 20", commentsResult.pagination.limit, 20);
    TestValidator.equals("total records is 0", commentsResult.pagination.records, 0);
    TestValidator.equals("total pages is 0", commentsResult.pagination.pages, 0);
}
/**
 * Register and authenticate a new member for E2E testing.
 *
 * Creates a member account with randomized credentials, mutates the connection with the auth token. The member can then be used for authenticated API requests across the Reddit-like community platform.
 *
 * @param connection - The API connection object with host and headers
 * @param props - Registration options with optional body override
 * @returns Authorization response with member identity and JWT tokens
 */
async function authorize_member_join(connection: api.IConnection, props: {
    body?: DeepPartial<IRedditPlatformMember.IJoin>;
}): Promise<IRedditPlatformMember.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        username: props.body?.username ??
            RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
        href: props.body?.href ?? typia.random<(string & tags.Format<"uri">)>(),
        referrer: props.body?.referrer ?? typia.random<(string & tags.Format<"uri">)>(),
        ip: props.body?.ip ?? typia.random<(string & tags.Format<"ipv4">)>(),
    } satisfies IRedditPlatformMember.IJoin;
    return await api.functional.redditPlatform.auth.member.join(connection, {
        body: joinInput,
    });
}