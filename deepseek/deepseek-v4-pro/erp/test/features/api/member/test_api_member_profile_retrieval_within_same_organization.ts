import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

/**
 * Test member profile retrieval within the same organization context.
 *
 * Validates that an authenticated member (Member A) can retrieve the complete profile of another member (Member B) who shares the same organization. Ensures that all profile fields — id, email, display_name, avatar_image, phone_number, created_at, and updated_at — are correctly returned and match the target member's known data.
 *
 * Critical security validation: confirms that the response body never contains password_hash or any other authentication-sensitive field. This is a mandatory requirement for all member profile retrieval operations.
 *
 * 1. Member A registers and authenticates via the join endpoint.
 * 2. Member B registers and authenticates via the join endpoint.
 * 3. Member A adds Member B as an employee in Member A's organization.
 * 4. Member A retrieves Member B's profile using Member B's member ID.
 * 5. Validates all profile fields match Member B's known data.
 * 6. Validates no password_hash or other sensitive fields are exposed.
 */
export async function test_api_member_profile_retrieval_within_same_organization(
  connection: api.IConnection,
) {
  // 1. Member A registers and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member B registers and authenticates
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Member A adds Member B as an employee in Member A's organization
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberAConnection,
    {
      body: {
        email: memberB.email,
      },
    },
  );
  typia.assert(employee);
  // 4. Member A retrieves Member B's full profile
  const profile = await api.functional.erpHrm.members.at(memberAConnection, {
    memberId: memberB.id,
  });
  typia.assert(profile);
  // 5. Validate all profile fields match Member B's known data
  TestValidator.equals("id matches", profile.id, memberB.id);
  TestValidator.equals("email matches", profile.email, memberB.email);
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    memberB.display_name,
  );
  TestValidator.equals(
    "avatar_image matches",
    profile.avatar_image,
    memberB.avatar_image,
  );
  TestValidator.equals(
    "phone_number matches",
    profile.phone_number,
    memberB.phone_number,
  );
  TestValidator.equals(
    "created_at matches",
    profile.created_at,
    memberB.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    profile.updated_at,
    memberB.updated_at,
  );
  // 6. Security: verify no password_hash exposed in response
  TestValidator.predicate(
    "no password_hash exposed",
    !("password_hash" in profile),
  );
}
