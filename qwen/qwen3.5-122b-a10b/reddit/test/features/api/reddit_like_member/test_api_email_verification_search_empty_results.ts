import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMemberEmailVerification";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account for authentication
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authorization token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 3. Search with non-existent member ID
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult1 =
    await api.functional.redditLike.member.email_verifications.index(
      memberConnection,
      {
        body: {
          reddit_like_member_id: nonExistentMemberId,
          page: 1,
          limit: 100,
        } satisfies IRedditLikeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(emptyResult1);
  // 4. Verify empty data array
  TestValidator.equals("data array is empty", emptyResult1.data.length, 0);
  // 5. Verify pagination metadata shows zero records
  TestValidator.equals(
    "pagination records is zero",
    emptyResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero",
    emptyResult1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current is one",
    emptyResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is hundred",
    emptyResult1.pagination.limit,
    100,
  );
  // 6. Search with non-existent email pattern
  const nonExistentEmail = `nonexistent_${RandomGenerator.alphabets(10)}@test.com`;
  const emptyResult2 =
    await api.functional.redditLike.member.email_verifications.index(
      memberConnection,
      {
        body: {
          email: nonExistentEmail,
          page: 1,
          limit: 100,
        } satisfies IRedditLikeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(emptyResult2);
  // 7. Verify second search also returns empty results
  TestValidator.equals(
    "second search data array is empty",
    emptyResult2.data.length,
    0,
  );
  TestValidator.equals(
    "second search pagination records is zero",
    emptyResult2.pagination.records,
    0,
  );
  TestValidator.equals(
    "second search pagination pages is zero",
    emptyResult2.pagination.pages,
    0,
  );
}
