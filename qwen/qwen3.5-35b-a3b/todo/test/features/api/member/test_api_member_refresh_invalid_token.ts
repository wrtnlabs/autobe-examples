import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import * as authMemberJoin from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import * as authMemberRefresh from "../../../authorize/authorize_member_refresh";

/**
 * Test the edge case where refresh token is invalid, expired, or does not match any stored session.
 * Validates that the system returns 401 Unauthorized error and does not generate new tokens.
 */
export async function test_api_member_refresh_invalid_token(connection: api.IConnection): Promise<void> {
    // 1. Create member account to establish baseline authentication state
    const memberConnection: api.IConnection = { host: connection.host };
    const member: IMultiUserTodoAppMember.IAuthorized = await authMemberJoin.authorize_member_join(memberConnection, {
        body: typia.random<IMultiUserTodoAppMember.IJoin>(),
    });
    typia.assert(member);
    // 2. Generate an invalid refresh token (random string that won't match stored token)
    const invalidRefreshToken: string = RandomGenerator.alphaNumeric(32);
    // 3. Attempt to refresh with invalid token
    await TestValidator.httpError("should reject invalid refresh token", 401, async () => {
        const invalidRefreshConnection: api.IConnection = { host: connection.host };
        await authMemberRefresh.authorize_member_refresh(invalidRefreshConnection, {
            body: {
                refresh_token: invalidRefreshToken,
            },
        });
    });
}

// Utility function for member refresh
export async function authorize_member_refresh(connection: api.IConnection, props: {
    body: IMultiUserTodoAppMember.IRefresh;
}): Promise<IMultiUserTodoAppMember.IAuthorized> {
    return await api.functional.multiUserTodoApp.auth.member.refresh(connection, {
        body: props.body,
    });
}

// Utility function for member join
export async function authorize_member_join(connection: api.IConnection, props: {
    body?: DeepPartial<IMultiUserTodoAppMember.IJoin>;
}): Promise<IMultiUserTodoAppMember.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin;
    return await api.functional.multiUserTodoApp.auth.member.join(connection, {
        body: joinInput,
    });
}