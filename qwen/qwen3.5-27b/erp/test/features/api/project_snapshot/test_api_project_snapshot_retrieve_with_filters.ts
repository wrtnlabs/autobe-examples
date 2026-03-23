import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test retrieving project snapshots with various filter combinations for an authenticated member.
 * 1. Authenticate as member
 * 2. Create a project for snapshot testing
 * 3. Create multiple snapshots at different times
 * 4. Test default pagination and ordering
 * 5. Test date range filtering
 * 6. Test creator filtering
 * 7. Test sorting options
 * 8. Verify pagination consistency
 * 9. Validate snapshot data integrity
 */
export async function test_api_project_snapshot_retrieve_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a project for snapshot testing
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create multiple snapshots at different times
  const snapshots = await ArrayUtil.asyncRepeat(5, async (index) => {
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
    return await api.functional.hrmPlatform.member.projects.snapshots.createSnapshot(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  });
  snapshots.forEach((snapshot) => typia.assert(snapshot));
  // 4. Test default pagination and ordering
  const defaultResponse =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {},
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default pagination limit",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.equals("default page", defaultResponse.pagination.current, 1);
  TestValidator.equals(
    "total snapshots count",
    defaultResponse.pagination.records,
    5,
  );
  // Verify snapshots are ordered by created_at descending
  TestValidator.predicate("snapshots ordered descending", () => {
    for (let i = 1; i < defaultResponse.data.length; i++) {
      if (
        new Date(defaultResponse.data[i].created_at).getTime() >
        new Date(defaultResponse.data[i - 1].created_at).getTime()
      ) {
        return false;
      }
    }
    return true;
  });
  // Verify all denormalized fields are present
  defaultResponse.data.forEach((snapshot) => {
    TestValidator.predicate(
      "has code",
      () => snapshot.code !== undefined && snapshot.code !== "",
    );
    TestValidator.predicate(
      "has name",
      () => snapshot.name !== undefined && snapshot.name !== "",
    );
    TestValidator.predicate("has status", () =>
      ["active", "completed", "archived"].includes(snapshot.status),
    );
    TestValidator.predicate(
      "has color_code",
      () => snapshot.color_code !== undefined,
    );
    TestValidator.predicate(
      "has creator",
      () => snapshot.creator.id !== undefined,
    );
  });
  // 5. Test date range filtering
  const firstSnapshotDate = new Date(
    defaultResponse.data[defaultResponse.data.length - 1].created_at,
  );
  const lastSnapshotDate = new Date(defaultResponse.data[0].created_at);
  const dateRangeResponse =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          from_date: firstSnapshotDate.toISOString(),
          to_date: lastSnapshotDate.toISOString(),
        },
      },
    );
  typia.assert(dateRangeResponse);
  TestValidator.equals(
    "date range returns all snapshots",
    dateRangeResponse.pagination.records,
    5,
  );
  // Test with narrower date range
  const middleDate = new Date(
    new Date(firstSnapshotDate).getTime() +
      (new Date(lastSnapshotDate).getTime() -
        new Date(firstSnapshotDate).getTime()) /
        2,
  );
  const narrowRangeResponse =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          from_date: middleDate.toISOString(),
          to_date: lastSnapshotDate.toISOString(),
        },
      },
    );
  typia.assert(narrowRangeResponse);
  TestValidator.predicate(
    "narrow range returns fewer snapshots",
    () => narrowRangeResponse.pagination.records < 5,
  );
  // 6. Test creator filtering
  const creatorFilterResponse =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          created_by_id: memberAuth.id,
        },
      },
    );
  typia.assert(creatorFilterResponse);
  TestValidator.equals(
    "all snapshots by same creator",
    creatorFilterResponse.pagination.records,
    5,
  );
  creatorFilterResponse.data.forEach((snapshot) => {
    TestValidator.equals(
      "snapshot creator matches",
      snapshot.creator.id,
      memberAuth.id,
    );
  });
  // 7. Test sorting options
  // Sort by created_at ascending
  const ascSortResponse =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "created_at",
          order: "asc",
        },
      },
    );
  typia.assert(ascSortResponse);
  TestValidator.predicate("ascending order correct", () => {
    for (let i = 1; i < ascSortResponse.data.length; i++) {
      if (
        new Date(ascSortResponse.data[i].created_at).getTime() <
        new Date(ascSortResponse.data[i - 1].created_at).getTime()
      ) {
        return false;
      }
    }
    return true;
  });
  // Sort by name descending
  const nameSortResponse =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "name",
          order: "desc",
        },
      },
    );
  typia.assert(nameSortResponse);
  // Sort by status
  const statusSortResponse =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: "status",
          order: "asc",
        },
      },
    );
  typia.assert(statusSortResponse);
  // 8. Verify pagination consistency
  const page1Response =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 2,
          limit: 2,
        },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 1 has 2 records", page1Response.data.length, 2);
  TestValidator.equals("page 2 has 2 records", page2Response.data.length, 2);
  TestValidator.equals(
    "total pages calculated correctly",
    page1Response.pagination.pages,
    3,
  );
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  // Verify no duplicate records between pages
  const page1Ids = page1Response.data.map((s) => s.id);
  const page2Ids = page2Response.data.map((s) => s.id);
  TestValidator.predicate("no duplicates between pages", () => {
    return page1Ids.every((id) => !page2Ids.includes(id));
  });
  // 9. Validate snapshot data integrity
  // Snapshots should reflect the project state at creation time
  const firstSnapshot = defaultResponse.data[defaultResponse.data.length - 1];
  TestValidator.equals(
    "snapshot name matches project",
    firstSnapshot.name,
    project.name,
  );
  TestValidator.equals(
    "snapshot status matches project",
    firstSnapshot.status,
    project.status,
  );
  TestValidator.equals(
    "snapshot color matches project",
    firstSnapshot.color_code,
    project.color_code,
  );
  // Verify creator information is included
  defaultResponse.data.forEach((snapshot) => {
    TestValidator.predicate(
      "creator has id",
      () => snapshot.creator.id !== undefined,
    );
    TestValidator.predicate(
      "creator has email",
      () => snapshot.creator.email !== undefined,
    );
    TestValidator.predicate(
      "creator has created_at",
      () => snapshot.creator.created_at !== undefined,
    );
  });
}
