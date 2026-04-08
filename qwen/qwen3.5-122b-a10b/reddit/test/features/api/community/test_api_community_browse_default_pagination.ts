import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_browse_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Browse communities with default pagination
  const result: IPageIRedditLikeCommunity.ISummary =
    await api.functional.redditLike.member.communities.index(memberConnection, {
      body: {} satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate pagination consistency: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    result.pagination.records / result.pagination.limit,
  );
  TestValidator.equals(
    "pages count matches calculation",
    result.pagination.pages,
    expectedPages,
  );
  // 5. Validate data array length matches pagination
  TestValidator.equals(
    "data array length within limit",
    result.data.length,
    Math.min(result.pagination.records, result.pagination.limit),
  );
  // 6. Validate community summaries structure and data integrity
  if (result.data.length > 0) {
    const community = result.data[0];
    typia.assert(community);
    // Validate owner summary structure
    const owner = community.owner;
    typia.assert(owner);
    // Validate business rules
    TestValidator.predicate(
      "subscriber count is non-negative",
      community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "owner karma score is valid integer",
      typeof owner.karma_score === "number",
    );
  }
}
