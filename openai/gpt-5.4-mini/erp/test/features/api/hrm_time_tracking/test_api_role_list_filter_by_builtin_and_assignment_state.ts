import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_list_filter_by_builtin_and_assignment_state(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const baseRequest = {
    page: 1,
    limit: 100,
    sortBy: "name",
    sortDirection: "asc",
  } satisfies IHrmTimeTrackingRole.IRequest;
  const allRoles = await api.functional.hrmTimeTracking.member.roles.index(
    memberConnection,
    { body: baseRequest },
  );
  typia.assert(allRoles);
  const repeatedAllRoles =
    await api.functional.hrmTimeTracking.member.roles.index(memberConnection, {
      body: baseRequest,
    });
  typia.assert(repeatedAllRoles);
  TestValidator.equals(
    "pagination stable on repeated browse",
    allRoles.pagination,
    repeatedAllRoles.pagination,
  );
  TestValidator.equals(
    "role browse stable on repeated request",
    allRoles.data,
    repeatedAllRoles.data,
  );
  TestValidator.predicate(
    "page limit respected",
    allRoles.data.length <= allRoles.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    allRoles.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    allRoles.pagination.pages >= 0,
  );
  const builtinOnly = await api.functional.hrmTimeTracking.member.roles.index(
    memberConnection,
    {
      body: {
        ...baseRequest,
        isBuiltin: true,
      } satisfies IHrmTimeTrackingRole.IRequest,
    },
  );
  typia.assert(builtinOnly);
  TestValidator.predicate(
    "builtin filter returns only builtin roles",
    builtinOnly.data.every((role) => role.isBuiltin === true),
  );
  const assignedOnly = await api.functional.hrmTimeTracking.member.roles.index(
    memberConnection,
    {
      body: {
        ...baseRequest,
        assignedOnly: true,
      } satisfies IHrmTimeTrackingRole.IRequest,
    },
  );
  typia.assert(assignedOnly);
  TestValidator.predicate(
    "assignedOnly result is subset of all roles by id",
    assignedOnly.data.every((assigned) =>
      allRoles.data.some((role) => role.id === assigned.id),
    ),
  );
  const builtinAssignedOnly =
    await api.functional.hrmTimeTracking.member.roles.index(memberConnection, {
      body: {
        ...baseRequest,
        isBuiltin: true,
        assignedOnly: true,
      } satisfies IHrmTimeTrackingRole.IRequest,
    });
  typia.assert(builtinAssignedOnly);
  TestValidator.predicate(
    "builtin assigned roles are still builtin",
    builtinAssignedOnly.data.every((role) => role.isBuiltin),
  );
  TestValidator.predicate(
    "builtin assigned roles are subset of builtin roles",
    builtinAssignedOnly.data.every((role) =>
      builtinOnly.data.some((item) => item.id === role.id),
    ),
  );
  const searchRequest = {
    ...baseRequest,
    search: "a",
  } satisfies IHrmTimeTrackingRole.IRequest;
  const searchedOnce = await api.functional.hrmTimeTracking.member.roles.index(
    memberConnection,
    { body: searchRequest },
  );
  typia.assert(searchedOnce);
  const searchedTwice = await api.functional.hrmTimeTracking.member.roles.index(
    memberConnection,
    { body: searchRequest },
  );
  typia.assert(searchedTwice);
  TestValidator.equals(
    "search request is stable across repeated calls",
    searchedOnce.data,
    searchedTwice.data,
  );
}
