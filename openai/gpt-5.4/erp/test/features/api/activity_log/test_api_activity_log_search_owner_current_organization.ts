import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_activity_log_search_owner_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const request = {
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies IHrmTimeTrackingActivityLog.IRequest;
  const page = await api.functional.hrmTimeTracking.owner.activityLogs.search(
    ownerConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "page data length is bounded by limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.equals(
    "total pages follow pagination formula",
    page.pagination.pages,
    page.pagination.limit === 0
      ? 0
      : Math.ceil(page.pagination.records / page.pagination.limit),
  );
  TestValidator.predicate(
    "pagination metadata is non-negative",
    page.pagination.records >= 0 && page.pagination.pages >= 0,
  );
  for (const activity of page.data) {
    typia.assert(activity);
    TestValidator.predicate(
      "activity actor type is present",
      activity.actor_type.length > 0,
    );
    TestValidator.predicate(
      "activity action type is present",
      activity.action_type.length > 0,
    );
    TestValidator.predicate(
      "activity target entity is present",
      activity.target_entity.length > 0,
    );
    TestValidator.predicate(
      "activity created_at is present",
      activity.created_at.length > 0,
    );
  }
}
