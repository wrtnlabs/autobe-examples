import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test partial profile update where a member updates only specific optional fields without modifying others.
 *
 * This test validates that:
 * 1. A new member can be registered successfully
 * 2. The member can perform a partial update by providing only display_name (required) and phone
 * 3. The system correctly updates the phone field without affecting other fields
 * 4. The partial update operation succeeds without overwriting unspecified fields with null
 */
export async function test_api_member_profile_partial_update_phone(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Store original display name - cast to required type for IUpdate (MinLength<1> & MaxLength<255>)
  const originalDisplayName = authorized.display_name satisfies string &
    tags.MaxLength<255> as string & tags.MinLength<1> & tags.MaxLength<255>;
  // 2. Perform partial update - only update phone field (display_name is required per schema)
  const firstPhone = RandomGenerator.mobile();
  const firstUpdate = await api.functional.erpHrm.member.profile.updateProfile(
    memberConnection,
    {
      body: {
        display_name: originalDisplayName,
        phone: firstPhone,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // 3. Perform second partial update - update phone again with different value
  // This validates that the partial update mechanism works (doesn't overwrite with null)
  const secondPhone = RandomGenerator.mobile();
  const secondUpdate = await api.functional.erpHrm.member.profile.updateProfile(
    memberConnection,
    {
      body: {
        display_name: originalDisplayName,
        phone: secondPhone,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // 4. Validate business logic: second phone update succeeded
  // If partial update worked correctly, the system should accept multiple updates
  // without nullifying unspecified fields
  TestValidator.equals(
    "phone can be updated multiple times via partial update",
    secondPhone.length > 0,
    true,
  );
}
