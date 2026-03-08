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

export async function test_api_karma_history_display(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(joined);
  memberConnection.headers = {
    Authorization: joined.token.access,
  };
  const karmaHistory =
    await api.functional.redditLike.member.karma.history(memberConnection);
  typia.assert(karmaHistory);
  TestValidator.equals(
    "has content_id",
    typeof karmaHistory.content_id,
    "string",
  );
  TestValidator.equals(
    "has content_type",
    ["post", "comment"].includes(karmaHistory.content_type),
    true,
  );
  TestValidator.equals(
    "has vote_value",
    [1, -1].includes(karmaHistory.vote_value),
    true,
  );
  TestValidator.equals(
    "has vote_created_at",
    typeof karmaHistory.vote_created_at,
    "string",
  );
  TestValidator.equals("has karma_change", karmaHistory.karma_change, 1);
  TestValidator.predicate(
    "has author object",
    karmaHistory.author !== undefined && karmaHistory.author !== null,
  );
  TestValidator.equals(
    "author has id",
    typeof karmaHistory.author.id,
    "string",
  );
  TestValidator.equals(
    "author has entity_type",
    ["post", "comment", "community"].includes(karmaHistory.author.entity_type),
    true,
  );
  TestValidator.equals(
    "author has title",
    typeof karmaHistory.author.title,
    "string",
  );
  TestValidator.equals(
    "author has score",
    typeof karmaHistory.author.score,
    "number",
  );
}
