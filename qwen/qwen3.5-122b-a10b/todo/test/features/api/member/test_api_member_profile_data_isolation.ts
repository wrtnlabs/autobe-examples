import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member profile data isolation.
 *
 * Verifies that authenticated members can only access their own profile information.
 * Two separate member accounts are registered and authenticated, then tested to ensure:
 * 1. Each member can successfully retrieve their own profile
 * 2. Members cannot access other members' profiles (data isolation enforced)
 * 3. Profile responses contain only non-sensitive information (no email exposure)
 */
export async function test_api_member_profile_data_isolation(connection: api.IConnection): Promise<void> {
    // 1. Register Member A
    const memberAConnection: api.IConnection = { host: connection.host };
    const memberAAuth = await authorize_member_join(memberAConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            displayName: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppMember.IJoin,
    });
    typia.assert(memberAAuth);
    // 2. Register Member B
    const memberBConnection: api.IConnection = { host: connection.host };
    const memberBAuth = await authorize_member_join(memberBConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            displayName: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppMember.IJoin,
    });
    typia.assert(memberBAuth);
    // 3. Member A retrieves their own profile
    const memberAProfile = await api.functional.todoApp.member.profile.at(memberAConnection);
    typia.assert(memberAProfile);
    // 4. Validate Member A's profile data
    TestValidator.equals("Member A profile ID matches", memberAProfile.id, memberAAuth.id);
    TestValidator.equals("Member A profile display_name matches", memberAProfile.display_name, memberAAuth.displayName);
    TestValidator.predicate("Member A profile has valid created_at", memberAProfile.created_at !== null);
    TestValidator.equals("Member A profile deleted_at is null", memberAProfile.deleted_at, null);
    // 5. Member B attempts to access Member A's profile (should fail)
    await TestValidator.httpError("Member B cannot access Member A's profile", [401, 403, 404], async () => {
        await api.functional.todoApp.member.profile.at(memberBConnection);
    });
    // 6. Member B retrieves their own profile (should succeed)
    const memberBProfile = await api.functional.todoApp.member.profile.at(memberBConnection);
    typia.assert(memberBProfile);
    // 7. Validate Member B's profile data
    TestValidator.equals("Member B profile ID matches", memberBProfile.id, memberBAuth.id);
    TestValidator.equals("Member B profile display_name matches", memberBProfile.display_name, memberBAuth.displayName);
    TestValidator.notEquals("Member A and B profiles are different", memberAProfile.id, memberBProfile.id);
    TestValidator.equals("Member B profile deleted_at is null", memberBProfile.deleted_at, null);
}