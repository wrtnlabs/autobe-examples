import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditMemberEmailVerification";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMemberEmailVerification";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_email_verification_token_search(connection: api.IConnection): Promise<void> {
    // 1. Register a new member (which creates a verification token)
    const memberConnection: api.IConnection = { host: connection.host };
    const registerResult = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
            username: RandomGenerator.name(),
        } satisfies IRedditMember.IJoin,
    });

    // 2. Generate a random partial token (4 characters for matching)
    const tokenPartial = RandomGenerator.alphabets(4);

    // 3. Search for tokens with partial match
    const result = await api.functional.reddit.member.email_verifications.index(memberConnection, {
        body: {
            search: tokenPartial,
        } satisfies IRedditMemberEmailVerification.IRequest,
    });

    typia.assert(result);

    // 4. Validate that at least one token contains the partial match
    TestValidator.predicate("should contain matching token", () => {
        return result.data.some(item => item.token.includes(tokenPartial));
    });
}