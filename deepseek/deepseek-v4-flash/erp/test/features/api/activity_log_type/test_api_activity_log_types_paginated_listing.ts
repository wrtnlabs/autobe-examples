import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLogType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_types_paginated_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. First page retrieval with limit=10, page=1, no filters
  const page1 =
    await api.functional.hrmTimeTracking.member.activityLogTypes.index(
      memberConnection,
      {
        body: {
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IHrmTimeTrackingActivityLogType.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Validate pagination metadata for page 1
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has records",
    () => page1.pagination.records > 0,
  );
  TestValidator.predicate("page 1 has pages", () => page1.pagination.pages > 0);
  TestValidator.predicate(
    "page 1 data count valid",
    () => page1.data.length >= 1 && page1.data.length <= 10,
  );
  // 4. Validate ordering: category ASC then code ASC
  if (page1.data.length >= 2) {
    for (let i: number = 0; i < page1.data.length - 1; i++) {
      const current = page1.data[i];
      const next = page1.data[i + 1];
      const currentCategory = current.category ?? "";
      const nextCategory = next.category ?? "";
      if (currentCategory < nextCategory) {
        continue;
      }
      TestValidator.equals(
        `same category at index ${i}`,
        currentCategory,
        nextCategory,
      );
      TestValidator.predicate(
        `code ascending at index ${i}`,
        () => current.code <= next.code,
      );
    }
  }
  // 5. Request page 2 and verify different records
  const page2 =
    await api.functional.hrmTimeTracking.member.activityLogTypes.index(
      memberConnection,
      {
        body: {
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IHrmTimeTrackingActivityLogType.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  TestValidator.predicate(
    "page 2 has records",
    () => page2.pagination.records > 0,
  );
  TestValidator.predicate("page 2 has pages", () => page2.pagination.pages > 0);
  // Verify different records on page 2 (if page 1 had records)
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Ids = new Set(page1.data.map((item) => item.id));
    const page2Ids = new Set(page2.data.map((item) => item.id));
    const hasOverlap = [...page2Ids].some((id) => page1Ids.has(id));
    TestValidator.predicate(
      "page 2 records differ from page 1",
      () => !hasOverlap,
    );
  }
  // Validate ordering for page 2 as well
  if (page2.data.length >= 2) {
    for (let i: number = 0; i < page2.data.length - 1; i++) {
      const current = page2.data[i];
      const next = page2.data[i + 1];
      const currentCategory = current.category ?? "";
      const nextCategory = next.category ?? "";
      if (currentCategory < nextCategory) {
        continue;
      }
      TestValidator.equals(
        `page 2 same category at index ${i}`,
        currentCategory,
        nextCategory,
      );
      TestValidator.predicate(
        `page 2 code ascending at index ${i}`,
        () => current.code <= next.code,
      );
    }
  }
}
