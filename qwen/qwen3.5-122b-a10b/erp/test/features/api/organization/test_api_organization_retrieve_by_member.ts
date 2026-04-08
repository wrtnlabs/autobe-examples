import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can successfully retrieve organization details.
 *
 * Validates the organization detail retrieval endpoint for members who belong to the organization. Ensures that all organization fields are correctly returned including identification, branding, and configuration settings.
 *
 * The test follows the standard member authentication flow and verifies that the organization data matches the expected structure and contains all required fields. Note: Organization creation and membership setup must be handled through test fixtures or separate setup procedures.
 *
 * 1. Register a new member account with email and password.
 * 2. Retrieve organization details using organization ID (organization must exist and member must belong to it via test fixtures).
 * 3. Validates response structure and field completeness.
 * 4. Verifies all organization configuration fields are present and valid.
 */
export async function test_api_organization_retrieve_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve organization details
  // Note: Organization must exist and member must belong to it (via test fixtures)
  // In simulation mode, this will return randomly generated valid organization data
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const organization = await api.functional.hrm.member.organizations.at(
    memberConnection,
    {
      organizationId,
    },
  );
  typia.assert(organization);
  // 3. Validate response structure and field completeness
  TestValidator.equals(
    "organization id matches",
    organization.id,
    organizationId,
  );
  TestValidator.predicate("name exists", organization.name.length > 0);
  TestValidator.predicate("currency is set", organization.currency.length > 0);
  TestValidator.predicate("timezone is set", organization.timezone.length > 0);
  TestValidator.predicate(
    "fiscal month in valid range",
    organization.fiscal_start_month >= 1 &&
      organization.fiscal_start_month <= 12,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(organization.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(organization.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "deleted_at is null for active organization",
    organization.deleted_at === null,
  );
}
