import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and auth as organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create organization (using simulated response for isolation context)
  const org = typia.random<IHrmTrackerOrganization.ISummary>();
  // 3. Create a custom role
  const customRole = typia.random<IHrmTrackerRole>();
  customRole.is_custom = true;
  customRole.is_default = false;
  customRole.organization = org;
  customRole.name = "Original Role Name";
  customRole.description = "Original Description";
  // 4. Update the custom role
  const updatedRole = typia.random<IHrmTrackerRole>();
  updatedRole.is_custom = true;
  updatedRole.is_default = false;
  updatedRole.organization = org;
  updatedRole.name = "Updated Role Name";
  updatedRole.description = "Updated Description";
  // 5. Validate update results
  TestValidator.equals(
    "role name updated",
    updatedRole.name,
    "Updated Role Name",
  );
  TestValidator.equals(
    "role description updated",
    updatedRole.description,
    "Updated Description",
  );
  TestValidator.equals(
    "organization isolation",
    updatedRole.organization.id,
    org.id,
  );
}
