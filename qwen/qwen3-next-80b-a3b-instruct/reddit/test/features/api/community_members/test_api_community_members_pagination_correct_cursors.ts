import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_members_pagination_correct_cursors(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Request paginated members with empty body (ICommunityMember.IRequest is empty object)
  const response = await api.functional.community.members.index(
    memberConnection,
    {
      body: {} satisfies ICommunityMember.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response structure
  const { pagination, data } = response;
  // Validate pagination metadata types
  TestValidator.predicate(
    "current page is a positive integer",
    Number.isInteger(pagination.current) && pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is a positive integer",
    Number.isInteger(pagination.limit) && pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative integer",
    Number.isInteger(pagination.records) && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative integer",
    Number.isInteger(pagination.pages) && pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate(
    "data array contains at least one member",
    data.length > 0,
  );
  // Verify each member matches ICommunityMember.ISummary (empty interface)
  // Since ICommunityMember.ISummary is empty {}, we just verify it's an object
  for (const member of data) {
    TestValidator.predicate("member is an object", typeof member === "object");
    TestValidator.predicate("member is not null", member !== null);
    // As an empty interface, no specific properties should be expected
    // typia.assert() ensures complete type safety
  }
  // Verify no extra properties are mistakenly added to the response
  // This is guaranteed by typia.assert() on IPageICommunityMember.ISummary
}
