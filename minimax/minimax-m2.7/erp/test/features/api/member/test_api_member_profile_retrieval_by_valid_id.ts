import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_member_profile_retrieval_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Set organization context
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    {},
  );
  // 3. Call GET /erpHrm/members/{memberId} with the authenticated member's ID
  const member = await api.functional.erpHrm.members.at(memberConnection, {
    memberId: authorized.id,
  });
  // 4. Validate response with typia.assert (validates all type constraints)
  typia.assert(member);
  // 5. Validate required fields exist (business logic)
  TestValidator.equals("id matches", member.id, authorized.id);
  TestValidator.equals("email matches", member.email, authorized.email);
  TestValidator.equals(
    "display_name matches",
    member.display_name,
    authorized.display_name,
  );
  TestValidator.predicate("created_at exists", !!member.created_at);
  TestValidator.predicate("updated_at exists", !!member.updated_at);
  // 6. Validate deleted_at is null or undefined (member is active)
  TestValidator.predicate(
    "deleted_at is null or undefined",
    member.deleted_at === null || member.deleted_at === undefined,
  );
}
