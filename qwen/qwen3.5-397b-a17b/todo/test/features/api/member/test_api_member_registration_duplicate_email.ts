import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member registration rejection when attempting to register with an email
 * address that already exists.
 *
 * This test validates that the system properly enforces email uniqueness during
 * member registration. The workflow:
 * 1. Register first member account with valid email and password
 * 2. Attempt to register second account with same email (different password)
 * 3. Verify duplicate registration is rejected with error
 *
 * This ensures the business rule that email must be unique across all member
 * accounts.
 */
export async function test_api_member_registration_duplicate_email(connection: api.IConnection): Promise<void> {
    // Generate unique email for first registration
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(16);
    // Step 1: Register first member account successfully
    const firstConnection: api.IConnection = { host: connection.host };
    const firstMember = await authorize_member_join(firstConnection, {
        body: {
            email: email,
            password: password,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IMultiUserTodoMember.IJoin,
    });
    typia.assert(firstMember);
    // Step 2: Attempt to register second account with same email (should fail)
    const secondConnection: api.IConnection = { host: connection.host };
    await TestValidator.error("duplicate email registration rejected", async () => {
        await authorize_member_join(secondConnection, {
            body: {
                email: email, // Same email as first registration
                password: RandomGenerator.alphaNumeric(16), // Different password
                href: typia.random<string & tags.Format<"uri">>(),
                referrer: typia.random<string & tags.Format<"uri">>(),
                ip: typia.random<string & tags.Format<"ipv4">>(),
            } satisfies IMultiUserTodoMember.IJoin,
        });
    });
}