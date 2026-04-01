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

/**
 * Test the primary success path where an authenticated member retrieves their currently selected organization context.
 * After member registration and authentication, the member should be able to call this endpoint and receive complete
 * organization details including id, name, description, logo, currency, timezone, fiscal_start_month, created_at, and
 * updated_at. Verify that all required fields are present and correctly formatted. The organization returned should
 * match the one the member belongs to through their employee record. Validate that the response structure matches
 * IHrmPlatformOrganization schema with all required properties populated correctly.
 */
export async function test_api_organization_context_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Retrieve organization context
  const organization: IHrmPlatformOrganization =
    await api.functional.hrmPlatform.member.organizations.my.at(
      memberConnection,
    );
  typia.assert(organization);
  // 3. Validate business logic (not type - typia.assert already validated types)
  TestValidator.predicate(
    "organization name is non-empty",
    organization.name.length > 0,
  );
}
