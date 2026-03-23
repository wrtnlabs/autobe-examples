import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerSystemVersion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_schema_version_search_and_date_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Call with search filter
  const searchResult = await api.functional.hrmTracker.member.versions.index(
    memberConnection,
    {
      body: {
        search: "v1.2",
      } satisfies IHrmTrackerSystemVersion.IRequest,
    },
  );
  typia.assert(searchResult);
  // 3. Call with applied_at_from filter
  const fromResult = await api.functional.hrmTracker.member.versions.index(
    memberConnection,
    {
      body: {
        applied_at_from: "2026-01-01T00:00:00Z",
      } satisfies IHrmTrackerSystemVersion.IRequest,
    },
  );
  typia.assert(fromResult);
  // 4. Call with applied_at_to filter
  const toResult = await api.functional.hrmTracker.member.versions.index(
    memberConnection,
    {
      body: {
        applied_at_to: "2026-03-23T23:59:59Z",
      } satisfies IHrmTrackerSystemVersion.IRequest,
    },
  );
  typia.assert(toResult);
  // 5. Verify results match search criteria
  searchResult.data.forEach((version) => {
    TestValidator.predicate("version contains search term", () =>
      version.version.includes("v1.2"),
    );
  });
  // 6. Verify date range filtering
  fromResult.data.forEach((version) => {
    const appliedDate = new Date(version.applied_at);
    const fromFilter = new Date("2026-01-01T00:00:00Z");
    TestValidator.predicate(
      "applied_at >= from",
      () => appliedDate >= fromFilter,
    );
  });
  toResult.data.forEach((version) => {
    const appliedDate = new Date(version.applied_at);
    const toFilter = new Date("2026-03-23T23:59:59Z");
    TestValidator.predicate("applied_at <= to", () => appliedDate <= toFilter);
  });
}
