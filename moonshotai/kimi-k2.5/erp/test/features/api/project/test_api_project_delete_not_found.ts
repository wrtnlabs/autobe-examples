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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

/**
 * Test deletion of a non-existent project returns 404 Not Found.
 *
 * 1. Authenticate as a member using authorize_member_join
 * 2. Generate a random UUID that doesn't correspond to any existing project
 * 3. Attempt to delete the project with the non-existent ID
 * 4. Verify that the API returns 404 Not Found error
 */
export async function test_api_project_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Generate a random UUID that doesn't exist
  const nonExistentProjectId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete non-existent project and expect 404
  await TestValidator.httpError(
    "should return 404 for non-existent project",
    404,
    async () => {
      await api.functional.erpHrm.member.projects.erase(memberConnection, {
        projectId: nonExistentProjectId,
      });
    },
  );
}
