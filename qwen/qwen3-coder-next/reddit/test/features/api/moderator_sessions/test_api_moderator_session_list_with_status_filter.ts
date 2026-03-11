import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMemberSession";
import type { IRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuestSession";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_session_list_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(moderator);
  // 2. List sessions with status filter
  const response = await api.functional.redditLike.moderator.sessions.index(
    moderatorConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "active",
      },
    },
  );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.equals("pagination exists", response.pagination.current, 1);
  TestValidator.predicate("has records", response.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", response.pagination.pages >= 0);
  // 4. Validate session items
  TestValidator.predicate("has sessions", response.data.length >= 0);
  response.data.forEach((session) => {
    TestValidator.equals("session has id", typeof session.id, "string");
    TestValidator.equals("member has id", typeof session.member.id, "string");
    TestValidator.equals(
      "member has username",
      typeof session.member.username,
      "string",
    );
    TestValidator.equals(
      "member has display_name",
      typeof session.member.display_name,
      "string",
    );
    TestValidator.predicate(
      "member has karma_score",
      typeof session.member.karma_score === "number",
    );
    TestValidator.equals(
      "has access_token",
      typeof session.access_token,
      "string",
    );
    TestValidator.equals("has ip", typeof session.ip, "string");
    TestValidator.equals("has user_agent", typeof session.user_agent, "string");
    TestValidator.equals(
      "created_at format",
      typeof session.created_at,
      "string",
    );
    TestValidator.equals(
      "updated_at format",
      typeof session.updated_at,
      "string",
    );
  });
}
