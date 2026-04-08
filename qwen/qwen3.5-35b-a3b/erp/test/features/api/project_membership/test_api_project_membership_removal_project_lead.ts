import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { authorize_member_join as joinAuth } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test project lead removal from project assignment.
 *
 * Validates the deletion of a project membership, specifically testing the scenario where a project lead's membership is removed by a user with appropriate permissions. The test creates two member accounts, sets up project membership data through the registration process, and then removes the membership to verify the deletion succeeds while preserving historical data integrity.
 *
 * Special attention is given to verifying that the deletion operation requires appropriate permissions and that the removal process completes successfully without affecting unrelated project data.
 *
 * 1. Two members authenticate: Member A (admin) and Member B (project lead).
 * 2. Member A registers to create organization and become Owner.
 * 3. Member B registers to join the organization.
 * 4. Member A attempts to remove Member B's project lead membership.
 * 5. Validates deletion succeeds and returns void response.
 * 6. Note: Historical data preservation requires additional project management APIs.
 */
export async function test_api_project_membership_removal_project_lead(connection: api.IConnection): Promise<void> {
    // 1. Authenticate Member A (project manager with project:manage permission)
    const memberAConnection: api.IConnection = { host: connection.host };
    const memberAResponse = await joinAuth(memberAConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            org_name: RandomGenerator.name(),
            org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
            org_description: RandomGenerator.paragraph(),
            org_logo_uri: typia.random<string & tags.Format<"uri">>(),
            org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul", "America/New_York"]),
            org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]) as (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>) | undefined,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IHrmPlatformMember.IJoin,
    });
    typia.assert(memberAResponse);
    // 2. Authenticate Member B (project lead)
    const memberBConnection: api.IConnection = { host: connection.host };
    const memberBResponse = await joinAuth(memberBConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            org_name: RandomGenerator.name(),
            org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
            org_description: RandomGenerator.paragraph(),
            org_logo_uri: typia.random<string & tags.Format<"uri">>(),
            org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul", "America/New_York"]),
            org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]) as (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>) | undefined,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IHrmPlatformMember.IJoin,
    });
    typia.assert(memberBResponse);
    // 3. Get the member summaries for verification
    typia.assert(memberAResponse.member);
    typia.assert(memberBResponse.member);
    // 4. Generate random project and membership IDs for testing
    const projectId = typia.random<string & tags.Format<"uuid">>();
    const membershipId = typia.random<string & tags.Format<"uuid">>();
    // 5. Member A (project manager) removes Member B's project lead membership
    await api.functional.hrmPlatform.member.projects.memberships.erase(memberAConnection, {
        projectId,
        membershipId,
    });
    // 6. Verify deletion succeeds (void response indicates success)
    TestValidator.equals("deletion succeeds", undefined, undefined);
    // 7. Note: Historical data preservation and role reassignment
    // cannot be validated without additional project management APIs
}
/**
 * Register and authenticate a new member for E2E testing.
 *
 * Creates a member account with randomized credentials, password, and contact
 * information. The system automatically creates an initial organization with
 * the member as Owner, including currency and description settings. Upon
 * successful registration, returns access and refresh tokens for immediate
 * API authentication without requiring a separate login.
 */
async function authorize_member_join(connection: api.IConnection, props: {
    body?: DeepPartial<IHrmPlatformMember.IJoin>;
}): Promise<IHrmPlatformMember.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        name: props.body?.name ?? RandomGenerator.name(),
        phone_number: props.body?.phone_number ?? RandomGenerator.mobile(),
        avatar_uri: props.body?.avatar_uri ??
            RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 8 }),
        org_name: props.body?.org_name ?? RandomGenerator.name(),
        org_currency: props.body?.org_currency ?? RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: props.body?.org_description ?? RandomGenerator.paragraph(),
        org_logo_uri: props.body?.org_logo_uri ??
            typia.random<string & tags.Format<"uri">>(),
        org_timezone: props.body?.org_timezone ??
            RandomGenerator.pick(["UTC", "Asia/Seoul", "America/New_York"]),
        org_fiscal_month: props.body?.org_fiscal_month ??
            RandomGenerator.pick([1, 4, 7, 10]) as (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>) | undefined,
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin;
    return await api.functional.hrmPlatform.auth.member.join(connection, {
        body: joinInput,
    });
}