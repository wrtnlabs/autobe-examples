import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
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
 * Test member profile update endpoint returns consistent data structure.
 *
 * Validates the member profile update functionality by creating a member account, updating their profile, and verifying the response contains all expected fields. Since the IHrmEmployee.IUpdate DTO is empty and no organization management APIs are available, this test focuses on endpoint functionality and response structure validation.
 *
 * 1. Create a new member account with random credentials
 * 2. Update the member's profile via the profile update endpoint
 * 3. Validate the response contains all IHrmEmployee fields
 * 4. Verify data structure consistency
 */
export async function test_api_member_profile_update_cross_organization_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.hrm.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(joinResult);
  // 2. Update member profile (empty body as per DTO definition)
  const profile = await api.functional.hrm.member.profile.update(
    memberConnection,
    {
      body: {} satisfies IHrmEmployee.IUpdate,
    },
  );
  typia.assert(profile);
  // 3. Validate response structure
  TestValidator.equals("profile id matches", profile.id, joinResult.id);
  TestValidator.equals(
    "profile email matches",
    profile.email,
    joinResult.email,
  );
  TestValidator.predicate("profile has created_at", () => !!profile.created_at);
  TestValidator.predicate("profile has updated_at", () => !!profile.updated_at);
  TestValidator.predicate(
    "profile deleted_at is null or timestamp",
    () => profile.deleted_at === null || !!profile.deleted_at,
  );
}
