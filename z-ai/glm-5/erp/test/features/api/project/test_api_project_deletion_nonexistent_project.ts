import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that attempting to delete a non-existent project returns 404 Not Found.
 *
 * Workflow:
 * 1. Create and authenticate a member account (gets owner role with project:manage permission)
 * 2. Attempt to delete a project with a non-existent UUID
 * 3. Verify the API returns 404 Not Found error
 */
export async function test_api_project_deletion_nonexistent_project(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Setup - Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Generate a non-existent project ID (valid UUID format)
  const nonExistentProjectId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to delete the non-existent project
  // Should return 404 Not Found error
  await TestValidator.httpError(
    "should return 404 when deleting non-existent project",
    404,
    async () => {
      await api.functional.erpHrm.member.projects.erase(memberConnection, {
        projectId: nonExistentProjectId,
      });
    },
  );
}
