import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_customer_account_retrieval(connection: api.IConnection): Promise<void> {
    // 1. Register customer with explicit profile data
    const joinInput = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin;
    const joinedOutput: IEcommerceMallMember.IAuthorized = await authorize_member_join(connection, { body: joinInput });
    typia.assert(joinedOutput);
    const memberId: string & tags.Format<"uuid"> = joinedOutput.id;
    const customerConnection: IConnection = { host: connection.host };
    customerConnection.headers = {
        Authorization: joinedOutput.token.access,
    };
    // 2. Retrieve customer by ID
    const retrievedCustomer: IEcommerceMallMember = await api.functional.ecommerceMall.members.at(customerConnection, {
        memberId,
    });
    typia.assert(retrievedCustomer);
    // 3. Validate response contains required fields and matches input
    TestValidator.equals("member id matches", retrievedCustomer.id, memberId);
    TestValidator.equals("email matches input", retrievedCustomer.email, joinInput.email);
    TestValidator.equals("display name matches input", retrievedCustomer.display_name, joinInput.display_name);
    TestValidator.equals("phone number matches input", retrievedCustomer.phone_number, joinInput.phone_number);
    // 4. Verify timestamps are valid (already validated by typia.assert with date-time tag)
    TestValidator.predicate("created_at is not null", retrievedCustomer.created_at !== null);
    TestValidator.predicate("updated_at is not null", retrievedCustomer.updated_at !== null);
    // 5. Verify password_hash is NOT in response (security)
    const responseKeys = Object.keys(retrievedCustomer) as string[];
    TestValidator.predicate("password_hash excluded from response", !responseKeys.includes("password_hash"));
}
/**
 * Register and authenticate a new member for E2E testing.
 *
 * Creates a member account with randomized credentials, mutates the connection with the auth token.
 * Generates random email, password, and session tracking data (href, referrer). Optional fields
 * like display_name, phone_number, and ip are either taken from props or randomly generated.
 * The function calls the SDK join endpoint and returns the IAuthorized response containing
 * both member identity data and JWT tokens.
 */
export async function do_authorize_member_join(connection: api.IConnection, props: {
    body?: DeepPartial<IEcommerceMallMember.IJoin>;
}): Promise<IEcommerceMallMember.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        display_name: props.body?.display_name ?? RandomGenerator.name(),
        phone_number: props.body?.phone_number ?? RandomGenerator.mobile(),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin;
    return await api.functional.ecommerceMall.auth.member.join(connection, {
        body: joinInput,
    });
}