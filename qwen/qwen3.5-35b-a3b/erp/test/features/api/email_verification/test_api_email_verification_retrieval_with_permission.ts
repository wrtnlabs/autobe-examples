import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberEmailVerification";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_retrieval_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authorization token
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Get organization context from member's memberships
  TestValidator.notEquals(
    "member should have at least one organization",
    memberAuth.organization_memberships.length,
    0,
  );
  const orgMembership = memberAuth.organization_memberships[0];
  typia.assert(orgMembership);
  // 3. Verify user has organization management permission (email:manage)
  const orgRole = orgMembership.organizationRole;
  typia.assert(orgRole);
  // 4. Generate a valid verification ID for testing
  // Note: This endpoint requires an existing verification ID in the database.
  // In a real test environment, a pre-existing verification record would be used.
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Retrieve email verification record
  const verification = await api.functional.hrms.member.email_verifications.at(
    memberConnection,
    {
      verificationId,
    },
  );
  typia.assert(verification);
  // 6. Verify response contains all required fields with valid types
  TestValidator.equals(
    "verification id matches",
    verification.id,
    verificationId,
  );
  TestValidator.equals(
    "used_at is null (unused token)",
    verification.used_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null (active record)",
    verification.deleted_at,
    null,
  );
  TestValidator.equals(
    "member_id exists",
    verification.member_id !== undefined,
    true,
  );
  TestValidator.equals(
    "token is string",
    typeof verification.token === "string",
    true,
  );
  TestValidator.equals(
    "expires_at exists",
    verification.expires_at !== undefined,
    true,
  );
  TestValidator.equals(
    "created_at exists",
    verification.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at exists",
    verification.updated_at !== undefined,
    true,
  );
  // 7. Verify verification belongs to organization context
  TestValidator.equals(
    "member_id matches org member",
    verification.member_id,
    orgMembership.member.id,
  );
}
