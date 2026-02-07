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

export async function test_api_community_members_unverified_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate a member (required for access to members endpoint)
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    } satisfies ICommunityMember.IJoin,
  });
  // Step 2: Query for unverified members
  // Even though IRequest is empty, we send empty object as per schema
  const filterBody: ICommunityMember.IRequest =
    {} satisfies ICommunityMember.IRequest;
  const response = await api.functional.community.members.index(
    memberConnection,
    {
      body: filterBody,
    },
  );
  typia.assert(response);
  // Step 3: Validate response structure
  TestValidator.equals(
    "response contains data array",
    Array.isArray(response.data),
    true,
  );
  TestValidator.equals(
    "response has pagination object",
    response.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default (10)",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is number",
    () =>
      typeof response.pagination.records === "number" &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is number",
    () =>
      typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
  );
  // Since ICommunityMember.ISummary is empty, we cannot validate properties of data items
  // But we can validate that data is an array of objects and has length matching pagination
  TestValidator.predicate(
    "data array has at least 0 elements",
    () => response.data.length >= 0,
  );
  TestValidator.equals(
    "data array length matches pagination records",
    response.data.length,
    response.pagination.records,
  );
  // Validate each data item is an object
  for (const member of response.data) {
    TestValidator.predicate(
      "member is object",
      () => member !== null && typeof member === "object",
    );
  }
}
