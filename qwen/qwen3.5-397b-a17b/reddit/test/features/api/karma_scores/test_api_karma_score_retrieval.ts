import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_karma_score_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve karma score by member ID
  const karmaScore = await api.functional.redditClone.karma_scores.at(
    connection,
    {
      memberId: member.id,
    },
  );
  typia.assert(karmaScore);
  // 3. Validate karma score structure and data consistency
  TestValidator.equals("member id matches", karmaScore.member.id, member.id);
  TestValidator.equals(
    "username matches",
    karmaScore.member.username,
    member.username,
  );
  TestValidator.equals(
    "display name matches",
    karmaScore.member.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "karma score matches",
    karmaScore.member.karma_score,
    member.karma_score.score,
  );
  TestValidator.predicate(
    "score is integer",
    Number.isInteger(karmaScore.score),
  );
}
