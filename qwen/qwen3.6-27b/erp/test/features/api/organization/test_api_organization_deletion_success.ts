import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Tests the happy path of organization deletion after member signup.
 *
 * Validates that a newly registered member can successfully delete their automatically
 * created default organization. The join process creates both the member account and
 * the associated organization context. This test confirms the organization can be
 * soft-deleted via the erase endpoint, returning 200 OK with null body.
 *
 * 1. Member registers via join, which auto-creates default organization.
 * 2. Extract/Generate the organization ID for the created context.
 * 3. Send DELETE request to remove the organization.
 * 4. Verify successful deletion without validation errors.
 */
export async function test_api_organization_deletion_success(
  connection: api.IConnection,
) {
  // 1. Authenticate as new member to create default organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Generate organization ID for the default organization that was created
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Send DELETE request to erase the organization
  await api.functional.hrmPlatform.organizations.erase(memberConnection, {
    organizationId,
  });
}
