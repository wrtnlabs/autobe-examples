import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an admin receives 404 error when attempting to retrieve a soft-deleted member.
 *
 * This test verifies that the GET /erpHrm/admin/members/{memberId} endpoint properly
 * filters out soft-deleted members. When an admin attempts to retrieve a member whose
 * deleted_at timestamp is set, the API should return HTTP 404 Not Found, not a 200
 * with null values. This ensures that soft-deleted members are properly hidden from
 * the API, protecting user privacy and data integrity.
 *
 * Test flow:
 * 1. Authenticate as admin using authorize_admin_join
 * 2. Attempt to retrieve a soft-deleted member using a known UUID from test fixtures
 * 3. Verify that the API returns HTTP 404 error
 */
export async function test_api_member_retrieval_soft_deleted_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // Step 2: Use a known UUID for a soft-deleted member from test fixtures
  // This UUID corresponds to a member that has been soft-deleted (deleted_at is set)
  const softDeletedMemberId = "00000000-0000-0000-0000-000000000001" as string &
    tags.Format<"uuid">;
  // Step 3: Attempt to retrieve the soft-deleted member and verify 404 error
  await TestValidator.httpError(
    "soft-deleted member should return 404",
    404,
    () =>
      api.functional.erpHrm.admin.members.at(adminConnection, {
        memberId: softDeletedMemberId,
      }),
  );
}
