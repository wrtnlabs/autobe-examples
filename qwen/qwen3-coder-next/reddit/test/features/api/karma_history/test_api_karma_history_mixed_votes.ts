import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_karma_history_mixed_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "password123",
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  memberConnection.headers = {
    Authorization: member.token.access,
  };
  // 2. Call karma history endpoint
  const karmaHistory: IRedditLikeMember.IKarmaHistory[] =
    typia.assert<IRedditLikeMember.IKarmaHistory[]>(
      await api.functional.redditLike.member.karma.history(memberConnection)
    );
  // 3. Validate response structure
  TestValidator.predicate(
    "has karma history records array",
    Array.isArray(karmaHistory),
  );
  // 4. Verify mixed vote types exist if records are present
  if (karmaHistory.length > 0) {
    const hasUpvotes = karmaHistory.some(
      (record) => record.vote_value === 1 && record.karma_change === 1,
    );
    const hasDownvotes = karmaHistory.some(
      (record) => record.vote_value === -1 && record.karma_change === -1,
    );
    TestValidator.predicate("contains upvote records (+1 karma)", hasUpvotes);
    TestValidator.predicate(
      "contains downvote records (-1 karma)",
      hasDownvotes,
    );
  }
  // 5. Validate record properties
  for (const record of karmaHistory) {
    TestValidator.equals(
      "vote_value matches karma_change",
      record.vote_value,
      record.karma_change,
    );
    TestValidator.predicate(
      "has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(record.id),
    );
    TestValidator.predicate(
      "has valid content_id format",
      /^[0-9a-f-]{36}$/i.test(record.content_id),
    );
    TestValidator.predicate(
      "content_type is post or comment",
      record.content_type === "post" || record.content_type === "comment",
    );
    TestValidator.predicate(
      "has valid timestamp format",
      !isNaN(new Date(record.vote_created_at).getTime()),
    );
  }
}