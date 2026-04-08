import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_index_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authentication token
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create actor-specific connection for timer operations
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 3. Test default pagination (page 1, limit 20)
  const defaultResponse = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    { body: { page: 1, limit: 20 } satisfies IHrmPlatformTimer.IRequest },
  );
  typia.assert(defaultResponse);
  // Validate default pagination metadata
  TestValidator.equals(
    "default current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals("default limit", defaultResponse.pagination.limit, 20);
  TestValidator.equals(
    "default records count",
    defaultResponse.pagination.records,
    defaultResponse.data.length,
  );
  TestValidator.equals(
    "default pages calculated",
    defaultResponse.pagination.pages,
    Math.ceil(
      defaultResponse.pagination.records / defaultResponse.pagination.limit,
    ),
  );
  // 4. Test empty results scenario
  const emptyResponse = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        createdAt: {
          gte: "2020-01-01T00:00:00.000Z",
          lte: "2020-12-31T23:59:59.999Z",
        } satisfies IHrmPlatformTimer.IRequest["createdAt"],
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty results page",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty results limit",
    emptyResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty results records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results pages",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results data array",
    emptyResponse.data,
    [] as IHrmPlatformTimer.ISummary[],
  );
  // 5. Test custom pagination
  const customPaginationResponse =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: { page: 2, limit: 50 } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(customPaginationResponse);
  TestValidator.equals(
    "custom page number",
    customPaginationResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit",
    customPaginationResponse.pagination.limit,
    50,
  );
  // 6. Test sorting by createdAt descending (default behavior)
  const sortedByCreatedAtDesc =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        sortField: "createdAt",
        sortOrder: "desc",
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(sortedByCreatedAtDesc);
  // Verify createdAt descending order
  for (let i = 0; i < sortedByCreatedAtDesc.data.length - 1; i++) {
    const current = sortedByCreatedAtDesc.data[i].createdAt;
    const next = sortedByCreatedAtDesc.data[i + 1].createdAt;
    TestValidator.predicate(
      `createdAt desc order check index ${i}`,
      new Date(current) >= new Date(next),
    );
  }
  // 7. Test sorting by createdAt ascending
  const sortedByCreatedAtAsc =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        sortField: "createdAt",
        sortOrder: "asc",
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(sortedByCreatedAtAsc);
  for (let i = 0; i < sortedByCreatedAtAsc.data.length - 1; i++) {
    const current = sortedByCreatedAtAsc.data[i].createdAt;
    const next = sortedByCreatedAtAsc.data[i + 1].createdAt;
    TestValidator.predicate(
      `createdAt asc order check index ${i}`,
      new Date(current) <= new Date(next),
    );
  }
  // 8. Test sorting by updatedAt
  const sortedByUpdatedAt =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        sortField: "updatedAt",
        sortOrder: "desc",
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(sortedByUpdatedAt);
  for (let i = 0; i < sortedByUpdatedAt.data.length - 1; i++) {
    const current = sortedByUpdatedAt.data[i].updatedAt;
    const next = sortedByUpdatedAt.data[i + 1].updatedAt;
    TestValidator.predicate(
      `updatedAt desc order check index ${i}`,
      new Date(current) >= new Date(next),
    );
  }
  // 9. Test sorting by durationSeconds
  const sortedByDuration = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        sortField: "durationSeconds",
        sortOrder: "desc",
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(sortedByDuration);
  for (let i = 0; i < sortedByDuration.data.length - 1; i++) {
    const current = sortedByDuration.data[i].durationSeconds;
    const next = sortedByDuration.data[i + 1].durationSeconds;
    TestValidator.predicate(
      `durationSeconds desc order check index ${i}`,
      current >= next,
    );
  }
  // 10. Test sorting by status
  const sortedByStatus = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        sortField: "status",
        sortOrder: "asc",
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(sortedByStatus);
  for (let i = 0; i < sortedByStatus.data.length - 1; i++) {
    const current = sortedByStatus.data[i].status;
    const next = sortedByStatus.data[i + 1].status;
    TestValidator.predicate(
      `status asc order check index ${i}`,
      current <= next,
    );
  }
  // 11. Test sorting by lastTickAt
  const sortedByLastTick = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        sortField: "lastTickAt",
        sortOrder: "desc",
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(sortedByLastTick);
  for (let i = 0; i < sortedByLastTick.data.length - 1; i++) {
    const current = sortedByLastTick.data[i].lastTickAt;
    const next = sortedByLastTick.data[i + 1].lastTickAt;
    TestValidator.predicate(
      `lastTickAt desc order check index ${i}`,
      new Date(current) >= new Date(next),
    );
  }
  // 12. Validate timer summary structure
  if (sortedByCreatedAtDesc.data.length > 0) {
    const sampleTimer = sortedByCreatedAtDesc.data[0];
    typia.assert(sampleTimer);
    // Check all required fields exist
    TestValidator.predicate("timer has valid id", sampleTimer.id !== undefined);
    TestValidator.predicate(
      "timer has status",
      sampleTimer.status !== undefined,
    );
    TestValidator.predicate(
      "timer has lastTickAt",
      sampleTimer.lastTickAt !== undefined,
    );
    TestValidator.predicate(
      "timer has durationSeconds",
      sampleTimer.durationSeconds !== undefined,
    );
    TestValidator.predicate(
      "timer has createdAt",
      sampleTimer.createdAt !== undefined,
    );
    TestValidator.predicate(
      "timer has updatedAt",
      sampleTimer.updatedAt !== undefined,
    );
    TestValidator.predicate(
      "timer has deletedAt",
      sampleTimer.deletedAt !== undefined,
    );
    TestValidator.predicate(
      "timer has project",
      sampleTimer.project !== undefined,
    );
    TestValidator.predicate("timer has task", sampleTimer.task !== undefined);
    // Validate field types
    TestValidator.predicate(
      "durationSeconds is non-negative",
      sampleTimer.durationSeconds >= 0,
    );
    TestValidator.predicate(
      "timer status is non-null",
      sampleTimer.status !== null,
    );
    // Validate project/task summary structure when present
    if (sampleTimer.project !== null) {
      typia.assert(sampleTimer.project);
      TestValidator.predicate(
        "project has id",
        sampleTimer.project.id !== undefined,
      );
      TestValidator.predicate(
        "project has name",
        sampleTimer.project.name !== undefined,
      );
      TestValidator.predicate(
        "project has status",
        sampleTimer.project.status !== undefined,
      );
      TestValidator.predicate(
        "project has color_code",
        sampleTimer.project.color_code !== undefined,
      );
    }
    if (sampleTimer.task !== null) {
      typia.assert(sampleTimer.task);
      TestValidator.predicate("task has id", sampleTimer.task.id !== undefined);
      TestValidator.predicate(
        "task has title",
        sampleTimer.task.title !== undefined,
      );
      TestValidator.predicate(
        "task has status",
        sampleTimer.task.status !== undefined,
      );
      TestValidator.predicate(
        "task has priority",
        sampleTimer.task.priority !== undefined,
      );
    }
  }
  // 13. Test status filter
  const filteredByStatus = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        status: "stopped",
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(filteredByStatus);
  for (const timer of filteredByStatus.data) {
    TestValidator.equals(
      `status filter matches for timer ${timer.id}`,
      timer.status,
      "stopped",
    );
  }
}