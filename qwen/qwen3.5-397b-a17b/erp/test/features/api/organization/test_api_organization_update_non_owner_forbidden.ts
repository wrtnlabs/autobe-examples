import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test that a member who is not the organization owner cannot update the organization settings.
 *
 * This test validates the critical authorization boundary that enforces strict ownership
 * validation and data isolation between organization members. The test creates an owner
 * member, creates an organization, creates a second non-owner member, and verifies that
 * the non-owner member cannot update the organization settings (should receive 403 Forbidden).
 */
export async function test_api_organization_update_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create organization as owner
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create non-owner member account
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(nonOwnerAuth);
  // 4. Attempt to update organization as non-owner (should fail with 403)
  const updateBody: IHrmPlatformOrganization.IUpdate = {
    name: RandomGenerator.name(),
  };
  await TestValidator.error(
    "non-owner cannot update organization",
    async () => {
      await api.functional.hrmPlatform.member.organizations.update(
        nonOwnerConnection,
        {
          organizationId: organization.id,
          body: updateBody,
        },
      );
    },
  );
  // 5. Verify owner can still update the organization (settings unchanged for non-owner)
  const updatedOrganization =
    await api.functional.hrmPlatform.member.organizations.update(
      ownerConnection,
      {
        organizationId: organization.id,
        body: updateBody,
      },
    );
  typia.assert(updatedOrganization);
  TestValidator.equals(
    "organization name updated by owner",
    updatedOrganization.name,
    updateBody.name,
  );
}
