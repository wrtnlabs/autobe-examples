import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";

export async function test_api_user_karma_public_retrieval_for_member_without_activity(
  connection: api.IConnection,
) {
  // 1. Register a fresh member user who has no posts/comments/votes yet.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Build an unauthenticated connection (no Authorization header).
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  // 3. Call karma retrieval as an unauthenticated caller.
  const firstKarma: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.userKarmas.byMemberUser.at(
      publicConnection,
      {
        memberUserId: authorized.id,
      },
    );
  typia.assert(firstKarma);

  // 4. Validate that the karma record belongs to the created member user
  //    and that all counters are zero for a no-activity account.
  TestValidator.equals(
    "karma record belongs to created member user",
    firstKarma.memberUserId,
    authorized.id,
  );

  TestValidator.equals(
    "total karma is zero for member without activity",
    firstKarma.totalKarma,
    0,
  );
  TestValidator.equals(
    "post karma is zero for member without activity",
    firstKarma.postKarma,
    0,
  );
  TestValidator.equals(
    "comment karma is zero for member without activity",
    firstKarma.commentKarma,
    0,
  );

  // deletedAt is optional; for a freshly joined & active user we expect it not
  // to be set to a concrete deletion timestamp.
  TestValidator.equals(
    "deletedAt is undefined for active karma record of new user",
    firstKarma.deletedAt,
    undefined,
  );

  // 5. Call the endpoint again and assert idempotence and lack of
  //    side-effect changes on read.
  const secondKarma: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.userKarmas.byMemberUser.at(
      publicConnection,
      {
        memberUserId: authorized.id,
      },
    );
  typia.assert(secondKarma);

  TestValidator.equals(
    "repeated karma retrieval returns identical aggregate snapshot",
    secondKarma,
    firstKarma,
  );
}
