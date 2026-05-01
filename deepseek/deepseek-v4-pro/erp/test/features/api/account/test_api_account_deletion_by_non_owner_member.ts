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

/**
 * Test account deletion by a member who is not the sole owner of any organization.
 *
 * Validates that a newly registered member with no organization ownership can
 * successfully delete their own account. The test confirms the DELETE endpoint
 * returns without error and verifies that subsequent authentication attempts
 * with the deleted account's credentials are rejected.
 *
 * The precondition is satisfied by using a freshly registered member whose
 * organizations array is empty — this guarantees the member is not the sole
 * owner of any organization, which would otherwise block deletion.
 *
 * 1. Register a new member with predictable credentials via the join endpoint.
 * 2. Confirm the member has no organizations (not a sole owner anywhere).
 * 3. Call the account deletion endpoint with the authenticated member.
 * 4. Verify the deletion succeeds (returns void without throwing).
 * 5. Attempt login with the deleted credentials — the request is rejected.
 */
export async function test_api_account_deletion_by_non_owner_member(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection with isolated headers
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate predictable credentials for post-deletion login verification
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Register and authenticate the new member
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(authorized);
  // 2. Confirm member is not a sole owner — organizations must be empty
  TestValidator.equals(
    "new member has no organizations",
    authorized.organizations.length,
    0,
  );
  // 3. Delete the member's own account
  await api.functional.erpHrm.member.account.erase(memberConnection);
  // 4. Verify subsequent login with deleted credentials is rejected
  await TestValidator.error(
    "login rejected after account deletion",
    async () => {
      await authorize_member_login(
        { host: connection.host },
        {
          body: {
            email,
            password,
            href: "",
            referrer: "",
          },
        },
      );
    },
  );
}
