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
 * Test error scenario: member attempts to retrieve organization context without selection.
 *
 * This test validates the business rule that requires organization context selection
 * before accessing organization-scoped data. After member registration, no organization
 * select endpoint is called. When attempting to retrieve the current organization context,
 * the system should throw an error (403 Forbidden) because no organization is selected
 * in the session.
 *
 * Workflow:
 * 1. Register a new member using authorize_member_join utility
 * 2. Do NOT select any organization (skip organization selection step)
 * 3. Attempt to retrieve current organization context
 * 4. Verify the operation throws an error indicating missing organization context
 */
export async function test_api_organization_context_no_selection_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (this creates session but without organization context)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Do NOT select an organization - skip this step intentionally
  // 3. Attempt to retrieve organization context without selection
  // This should throw an error (403 Forbidden) because no organization is selected
  await TestValidator.error(
    "should fail when no organization context is selected",
    async () => {
      await api.functional.hrmPlatform.member.organizations.my.at(
        memberConnection,
      );
    },
  );
}
