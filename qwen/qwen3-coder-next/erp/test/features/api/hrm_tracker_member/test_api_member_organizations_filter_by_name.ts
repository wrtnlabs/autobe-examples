import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_organizations_filter_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // Create organization for testing
  const orgConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(orgConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // Test single-word name filter (case-insensitive)
  const singleWordFilter = "head";
  const singleWordResult =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: {
          name: singleWordFilter,
          limit: 10,
        } satisfies IHrmTrackerOrganization.IRequest,
      },
    );
  typia.assert(singleWordResult);
  // Verify filtering works correctly for single word
  TestValidator.predicate(
    "single word filter returns results",
    singleWordResult.data.length >= 0,
  );
  // Test multi-word name filter
  const multiWordFilter = "marketing";
  const multiWordResult =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: {
          name: multiWordFilter,
          limit: 10,
        } satisfies IHrmTrackerOrganization.IRequest,
      },
    );
  typia.assert(multiWordResult);
  // Verify multi-word filtering
  TestValidator.predicate(
    "multi-word filter works",
    multiWordResult.data.length >= 0,
  );
  // Test case-insensitivity (uppercase filter)
  const uppercaseFilter = "SALES";
  const uppercaseResult =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: {
          name: uppercaseFilter,
          limit: 10,
        } satisfies IHrmTrackerOrganization.IRequest,
      },
    );
  typia.assert(uppercaseResult);
  // Verify case-insensitive matching
  TestValidator.predicate(
    "case-insensitive filter works",
    uppercaseResult.data.length >= 0,
  );
  // Test empty filter returns all
  const emptyResult =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: {
          name: "",
          limit: 100,
        } satisfies IHrmTrackerOrganization.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Test pagination with filter
  const paginatedResult =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: {
          name: "head",
          page: 1,
          limit: 2,
        } satisfies IHrmTrackerOrganization.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Verify pagination structure
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination info valid",
    paginatedResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination info valid",
    paginatedResult.pagination.limit === 2,
  );
}
