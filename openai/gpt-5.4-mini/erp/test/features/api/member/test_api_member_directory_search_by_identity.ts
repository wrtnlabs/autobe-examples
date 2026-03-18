import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_directory_search_by_identity(
  connection: api.IConnection,
): Promise<void> {
  const matchedConnection: api.IConnection = { host: connection.host };
  const matchedEmail = `search-${RandomGenerator.alphaNumeric(8)}@example.com`;
  const matched = await authorize_member_join(matchedConnection, {
    body: {
      email: matchedEmail satisfies IHrmTimeTrackingMember.IJoin["email"],
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(matched);
  const otherConnection: api.IConnection = { host: connection.host };
  const otherEmail = `other-${RandomGenerator.alphaNumeric(8)}@example.com`;
  const other = await authorize_member_join(otherConnection, {
    body: {
      email: otherEmail satisfies IHrmTimeTrackingMember.IJoin["email"],
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(other);
  const searchTerm = matched.email.slice(0, matched.email.indexOf("@"));
  const output = await api.functional.hrmTimeTracking.member.members.index(
    matchedConnection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 100,
      } satisfies IHrmTimeTrackingMember.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals("pagination current", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 100);
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "contains the matched member",
    output.data.some((member) => member.email === matched.email),
  );
  TestValidator.predicate(
    "does not contain non-matching member",
    !output.data.some((member) => member.email === other.email),
  );
  TestValidator.predicate(
    "all results match the search term",
    output.data.every((member) => member.email.includes(searchTerm)),
  );
}
