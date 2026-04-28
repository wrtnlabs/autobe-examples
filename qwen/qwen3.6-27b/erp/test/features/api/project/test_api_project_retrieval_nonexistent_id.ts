import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieval behavior for non-existent project IDs.
 *
 * Validates that attempting to retrieve a project using a valid UUID format that does not correspond to any existing project returns 404 Not Found. This covers both projects that never existed and soft-deleted projects (deleted_at is not null) which should also return 404 as per the specification.
 *
 * The test authenticates as a member, generates a fabricated UUID that could never have been created in the system, and verifies the HTTP 404 error response.
 *
 * 1. Authenticate as a member account.
 * 2. Generate a valid UUID format that does not exist in the system.
 * 3. Attempt to retrieve the non-existent project using api.functional.hrmPlatform.member.projects.at.
 * 4. Validate the system returns 404 Not Found status.
 */
export async function test_api_project_retrieval_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "test@example.com",
      password: "testpassword123",
      display_name: "Test User",
      href: "https://example.com",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Generate a valid UUID format that does not correspond to any existing project
  // This fabricated UUID could never have been created in the system, which also
  // covers the case where a project has been soft-deleted (deleted_at is not null)
  const nonExistentProjectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the non-existent project - should return 404 Not Found
  await TestValidator.httpError(
    "404 Not Found for non-existent project ID",
    404,
    async () => {
      await api.functional.hrmPlatform.member.projects.at(memberConnection, {
        projectId: nonExistentProjectId,
      });
    },
  );
}
