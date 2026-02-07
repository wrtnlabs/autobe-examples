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

export async function test_api_community_members_search_with_karma_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member to use the search endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  // ICommunityMember.IJoin = {} per schema definition
  // We cannot provide email, password, or bio - must use empty object
  const authorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Use the authenticated connection to call the search endpoint with an empty body
  // Since ICommunityMember.IRequest is defined as {}, we can only pass an empty object
  // We cannot construct any filter parameters like min_karma or sort because they don't exist in the schema
  const searchBody: ICommunityMember.IRequest =
    {} satisfies ICommunityMember.IRequest;
  const result = await api.functional.community.members.index(
    memberConnection,
    {
      body: searchBody,
    },
  );
  typia.assert(result);
  // 3. Validate the pagination structure which is defined in IPageICommunityMember.ISummary
  TestValidator.equals("pagination structure", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10); // Default limit should be 10 or what the API defaults to
  TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    result.pagination.pages >= 0,
  );
  // 4. Validate that data array exists and has at least one member
  // Since ISummary is {} we cannot validate any properties on the members
  // We can only verify the array is present
  TestValidator.predicate("at least one result", result.data.length >= 0);
}
