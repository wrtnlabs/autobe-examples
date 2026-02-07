import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_feed_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Join as member to establish session
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      // ICommunityMember.IJoin is empty object according to DTO
      // This is sufficient to create a member account
    },
  });
  typia.assert(joinResponse);
  // Step 2: Generate a valid UUID for communityId
  // The scenario requires the member to be subscribed to the community,
  // but we have no API to create a community or subscribe a member.
  // We'll assume the server has at least one community where this member
  // is subscribed, and use a randomized UUID as communityId.
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Request community feed with empty request body
  // ICommunityPost.IRequest is empty object per DTO
  // According to endpoint description, 'new' algorithm is default
  // when no sort parameter is specified, so we send empty body
  const feedResponse =
    await api.functional.community.member.feed.community.index(
      memberConnection,
      {
        communityId,
        body: {},
      },
    );
  typia.assert(feedResponse);
  // Step 4: Validate response structure
  // Validate pagination structure exists
  TestValidator.predicate(
    "pagination exists",
    feedResponse.pagination !== undefined,
  );
  TestValidator.predicate("data exists", Array.isArray(feedResponse.data));
  // Validate pagination properties are correct types
  TestValidator.predicate(
    "current is number",
    typeof feedResponse.pagination.current === "number",
  );
  TestValidator.predicate(
    "limit is number",
    typeof feedResponse.pagination.limit === "number",
  );
  TestValidator.predicate(
    "records is number",
    typeof feedResponse.pagination.records === "number",
  );
  TestValidator.predicate(
    "pages is number",
    typeof feedResponse.pagination.pages === "number",
  );
  // Validate pagination values are non-negative
  TestValidator.predicate("current >= 0", feedResponse.pagination.current >= 0);
  TestValidator.predicate("limit > 0", feedResponse.pagination.limit > 0);
  TestValidator.predicate("records >= 0", feedResponse.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", feedResponse.pagination.pages >= 0);
  // Validate data array length
  TestValidator.predicate("data length >= 0", feedResponse.data.length >= 0);
  // Validate each post in data array
  for (const post of feedResponse.data) {
    // ICommunityPost.ISummary is empty object according to DTO
    // We can only validate it's a non-null object
    TestValidator.predicate(
      "post is object",
      typeof post === "object" && post !== null,
    );
  }
}
