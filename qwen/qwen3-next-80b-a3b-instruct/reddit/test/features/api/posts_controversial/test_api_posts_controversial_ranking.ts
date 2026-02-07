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

export async function test_api_posts_controversial_ranking(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate member to establish context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  typia.assert(member);
  // Query the controversial ranking endpoint
  const request: ICommunityPost.IRequest = {};
  const response: IPageICommunityPost.ISummary =
    await api.functional.community.member.posts.controversial.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(response);
  // Validate pagination metadata structure
  TestValidator.equals("page should be 1", response.pagination.current, 1);
  TestValidator.equals("limit should be 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "records should be >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be >= 1",
    response.pagination.pages >= 1,
  );
  // Validate data array exists and has correct type
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "data array should have some entries",
    response.data.length > 0,
  );
  // We cannot validate individual post properties because ICommunityPost.ISummary is empty
  // in the provided schema definition. We must assume the API correctly returns this structure.
  // We cannot validate controversy ranking order because we don't have access to the properties
  // (vote_score, total_votes, etc.) required for the algorithm as per the scenario plan.
  // This is a limitation of the provided DTO schema.
}
