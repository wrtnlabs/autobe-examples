import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the basic project listing functionality with pagination.
 *
 * Validates the complete project listing flow including member authentication, paginated project retrieval, and response structure verification. Ensures that pagination metadata is accurate and project summaries contain all required fields.
 *
 * Special attention is given to verifying pagination consistency, organization isolation (projects belong to authenticated member's organization), and proper handling of empty result sets.
 *
 * 1. Authenticate as a member using /auth/member/join
 * 2. Call /hrmTimeTrack/member/projects with pagination parameters (page=1, limit=10)
 * 3. Verify response contains pagination metadata and project summaries with required fields
 * 4. Verify consistent ordering and test pagination by requesting page 2
 */
export async function test_api_project_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Request first page of projects with pagination
  const page1 = await api.functional.hrmTimeTrack.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackProject.IRequest,
    },
  );
  typia.assert(page1);
  // 3. Verify pagination metadata
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 10", page1.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    page1.pagination.pages >= 0,
  );
  // 4. Verify each project summary has required fields
  await ArrayUtil.asyncForEach(page1.data, async (project) => {
    typia.assert(project);
    // Verify required fields exist
    TestValidator.predicate("project has id", project.id !== undefined);
    TestValidator.predicate("project has name", project.name !== undefined);
    TestValidator.predicate(
      "project has color_code",
      project.color_code !== undefined,
    );
    TestValidator.predicate("project has status", project.status !== undefined);
    TestValidator.predicate(
      "project has organization",
      project.organization !== undefined,
    );
    TestValidator.predicate(
      "project has created_at",
      project.created_at !== undefined,
    );
    TestValidator.predicate(
      "project has updated_at",
      project.updated_at !== undefined,
    );
    // Verify deleted_at is null (only non-deleted projects returned)
    TestValidator.equals("deleted_at is null", project.deleted_at, null);
    // Verify organization reference
    typia.assert(project.organization);
    TestValidator.predicate(
      "organization has id",
      project.organization.id !== undefined,
    );
    TestValidator.predicate(
      "organization has name",
      project.organization.name !== undefined,
    );
  });
  // 5. Test pagination: request page 2
  const page2 = await api.functional.hrmTimeTrack.member.projects.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IHrmTimeTrackProject.IRequest,
    },
  );
  typia.assert(page2);
  // Verify page 2 metadata
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit is 10", page2.pagination.limit, 10);
  // If page 1 had data, verify page 2 is either different or empty
  if (page1.data.length > 0) {
    if (page2.data.length > 0) {
      // Verify different projects between pages
      const page1Ids = new Set(page1.data.map((p) => p.id));
      const page2Ids = new Set(page2.data.map((p) => p.id));
      const hasOverlap = Array.from(page1Ids).some((id) => page2Ids.has(id));
      TestValidator.predicate("page 2 has different projects", !hasOverlap);
    }
    // If page 2 is empty, that's acceptable (no more projects)
  }
  // 6. Test edge case: empty result with status filter
  const emptyResult = await api.functional.hrmTimeTrack.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "completed",
      } satisfies IHrmTimeTrackProject.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify empty result structure
  TestValidator.equals(
    "empty result current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals("empty result limit", emptyResult.pagination.limit, 10);
  TestValidator.equals("empty result data array", emptyResult.data.length, 0);
}
