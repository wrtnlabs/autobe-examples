import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

/**
 * Test successful retrieval of an organization by its owner.
 *
 * Validates that:
 * - Owner can retrieve their organization details
 * - All organization fields are returned correctly
 * - Owner information matches the authenticated member
 */
export async function test_api_organization_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a new organization (member becomes owner automatically)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Retrieve the created organization using the GET endpoint
  const retrieved = await api.functional.erpHrm.member.organizations.at(
    memberConnection,
    { organizationId: organization.id },
  );
  typia.assert(retrieved);
  // 4. Validate organization details
  TestValidator.equals("organization id", retrieved.id, organization.id);
  TestValidator.equals("organization name", retrieved.name, organization.name);
  TestValidator.equals(
    "description",
    retrieved.description,
    organization.description,
  );
  TestValidator.equals(
    "logo image",
    retrieved.logoImage,
    organization.logoImage,
  );
  TestValidator.equals("currency", retrieved.currency, organization.currency);
  TestValidator.equals("timezone", retrieved.timezone, organization.timezone);
  TestValidator.equals(
    "fiscal start month",
    retrieved.fiscalStartMonth,
    organization.fiscalStartMonth,
  );
  // 5. Validate owner information
  TestValidator.equals("owner id", retrieved.owner.id, member.id);
  TestValidator.equals("owner email", retrieved.owner.email, member.email);
  TestValidator.equals(
    "owner display name",
    retrieved.owner.displayName,
    member.display_name,
  );
  // 6. Validate timestamps
  TestValidator.predicate(
    "created at is present",
    retrieved.createdAt !== null && retrieved.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated at is present",
    retrieved.updatedAt !== null && retrieved.updatedAt !== undefined,
  );
  TestValidator.equals("deleted at is null", retrieved.deletedAt, null);
}
