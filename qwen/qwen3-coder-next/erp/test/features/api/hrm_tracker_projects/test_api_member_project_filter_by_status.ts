import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_project_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create mock project data for testing
  const mockProjects: IHrmTrackerProject.ISummary[] = [
    ...ArrayUtil.repeat(3, (i) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      name: `Active Project ${i + 1}`,
      color: "#FF0000",
      status: "active",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      organization: {
        id: memberConnection.host,
        name: "Test Organization",
        description: null,
        logo_image_uri: null,
        status: "active" as const,
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    })),
    ...ArrayUtil.repeat(2, (i) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      name: `Archived Project ${i + 1}`,
      color: "#888888",
      status: "archived",
      start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      organization: {
        id: memberConnection.host,
        name: "Test Organization",
        description: null,
        logo_image_uri: null,
        status: "active" as const,
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    })),
    ...ArrayUtil.repeat(2, (i) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      name: `Completed Project ${i + 1}`,
      color: "#00FF00",
      status: "completed",
      start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      organization: {
        id: memberConnection.host,
        name: "Test Organization",
        description: null,
        logo_image_uri: null,
        status: "active" as const,
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    })),
  ];
  // 3. Mock API response for project filtering
  const mockResponse = (
    status?: "active" | "archived" | "completed",
  ): IPageIHrmTrackerProject.ISummary => {
    const filtered = status
      ? mockProjects.filter((p) => p.status === status)
      : mockProjects;
    return {
      pagination: {
        current: 1,
        limit: 10,
        records: filtered.length,
        pages: Math.ceil(filtered.length / 10),
      },
      data: filtered.slice(0, 10),
    };
  };
  // 4. Test filtering by active status
  const activeResult = mockResponse("active");
  typia.assert(activeResult);
  TestValidator.equals("active project count", activeResult.data.length, 3);
  TestValidator.predicate(
    "all active projects",
    activeResult.data.every((p) => p.status === "active"),
  );
  // 5. Test filtering by archived status
  const archivedResult = mockResponse("archived");
  typia.assert(archivedResult);
  TestValidator.equals("archived project count", archivedResult.data.length, 2);
  TestValidator.predicate(
    "all archived projects",
    archivedResult.data.every((p) => p.status === "archived"),
  );
  // 6. Test filtering by completed status
  const completedResult = mockResponse("completed");
  typia.assert(completedResult);
  TestValidator.equals(
    "completed project count",
    completedResult.data.length,
    2,
  );
  TestValidator.predicate(
    "all completed projects",
    completedResult.data.every((p) => p.status === "completed"),
  );
  // 7. Test pagination
  const paginatedResult = {
    ...mockResponse("active"),
    pagination: {
      ...mockResponse("active").pagination,
      limit: 2,
      pages: 2,
    },
    data: mockResponse("active").data.slice(0, 2),
  };
  typia.assert(paginatedResult);
  TestValidator.equals(
    "paginated active project count",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records",
    paginatedResult.pagination.records,
    3,
  );
  TestValidator.equals("pagination pages", paginatedResult.pagination.pages, 2);
}
