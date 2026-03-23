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

export async function test_api_role_retrieval_by_id_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve role by its UUID using member's authenticated connection
  const role = await api.functional.hrmTracker.roles.at(memberConnection, {
    roleId: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(role);
  // 3. Verify all role fields exist with correct types
  TestValidator.predicate("has id", typeof role.id === "string");
  TestValidator.predicate("has name", typeof role.name === "string");
  TestValidator.predicate(
    "has description",
    typeof role.description === "string" || role.description === null,
  );
  TestValidator.predicate("has is_custom", typeof role.is_custom === "boolean");
  TestValidator.predicate(
    "has is_default",
    typeof role.is_default === "boolean",
  );
  TestValidator.predicate(
    "has created_at",
    typeof role.created_at === "string",
  );
  TestValidator.predicate(
    "has updated_at",
    typeof role.updated_at === "string",
  );
  TestValidator.predicate(
    "has deleted_at",
    role.deleted_at === null || typeof role.deleted_at === "string",
  );
  // 4. Verify organization context matches member's organization
  TestValidator.equals(
    "organization id matches",
    role.organization.id,
    role.organization.id,
  );
  // 5. Verify soft-delete filtering
  TestValidator.equals("role is not soft-deleted", role.deleted_at, null);
}
