import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_join_duplicate_email_conflict(connection: api.IConnection): Promise<void> {
    // Step 1: Register first user
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(16);
    const username = RandomGenerator.alphaNumeric(12);
    await api.functional.communityPlatform.auth.user.join(connection, {
        body: {
            email,
            password,
            username,
            display_name: RandomGenerator.name(),
            bio: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformUser.IJoin,
    });
    // Step 2: Attempt to register second user with same email
    await TestValidator.error("duplicate email registration", async () => {
        await api.functional.communityPlatform.auth.user.join(connection, {
            body: {
                email,
                password: RandomGenerator.alphaNumeric(16),
                username: RandomGenerator.alphaNumeric(12),
                display_name: RandomGenerator.name(),
                bio: RandomGenerator.paragraph({ sentences: 2 }),
            } satisfies ICommunityPlatformUser.IJoin,
        });
    });
}