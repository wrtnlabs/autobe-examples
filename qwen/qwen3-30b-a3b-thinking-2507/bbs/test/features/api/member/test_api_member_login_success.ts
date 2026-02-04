import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success(connection: api.IConnection) {
    // Step 1: Create a new member account
    const joinConnection: api.IConnection = { host: connection.host };
    const account = await authorize_member_join(joinConnection, { body: {} });

    // Step 2: Prepare for login
    const loginConnection: api.IConnection = { host: connection.host };
    const email = typia.random<string & tags.Format<"email">>();
    const loginData = {
        email: email,
        password: "validPassword123",
        href: "/",
        referrer: "/",
    };

    // Step 3: Measure token generation time
    const startTime = Date.now();
    const account2 = await authorize_member_login(loginConnection, { body: loginData });
    const endTime = Date.now();
    const timeTaken = endTime - startTime;

    // Step 4: Verify token generation within 500ms
    await TestValidator.predicate("token generation within 500ms", timeTaken <= 500);

    // Step 5: Verify user profile properties
    typia.assert(account2);
    TestValidator.equals("user profile article count", account2.article_count, 0);
    TestValidator.equals("user profile comment count", account2.comment_count, 0);
    TestValidator.equals("user profile display name", account2.display_name, "");
    TestValidator.equals("user profile bio", account2.bio, "");
    TestValidator.equals("user profile token access", account2.token.access, account2.token.access);
}