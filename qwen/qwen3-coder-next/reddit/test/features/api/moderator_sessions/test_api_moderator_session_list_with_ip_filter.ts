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

export async function test_api_moderator_session_list_with_ip_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Create sessions from different IPs
  const ip1 = "192.168.1.100";
  const ip2 = "10.0.0.50";
  // Create multiple sessions from ip1
  for (let i = 0; i < 3; i++) {
    await api.functional.redditLike.moderator.sessions.index(
      moderatorConnection,
      {
        body: {
          ip: ip1,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeGuestSession.IRequest,
      },
    );
  }
  // Create sessions from ip2
  await api.functional.redditLike.moderator.sessions.index(
    moderatorConnection,
    {
      body: {
        ip: ip2,
        page: 1,
        limit: 10,
      } satisfies IRedditLikeGuestSession.IRequest,
    },
  );
  await api.functional.redditLike.moderator.sessions.index(
    moderatorConnection,
    {
      body: {
        ip: ip2,
        page: 1,
        limit: 10,
      } satisfies IRedditLikeGuestSession.IRequest,
    },
  );
  // 3. Filter by ip1
  const filteredByIp1 =
    await api.functional.redditLike.moderator.sessions.index(
      moderatorConnection,
      {
        body: {
          ip: ip1,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeGuestSession.IRequest,
      },
    );
  typia.assert(filteredByIp1);
  // 4. Validate ip1 results
  TestValidator.equals("filter ip1 count", filteredByIp1.data.length, 3);
  filteredByIp1.data.forEach((session) => {
    TestValidator.equals("IP matches filter ip1", session.ip, ip1);
  });
  // 5. Filter by ip2
  const filteredByIp2 =
    await api.functional.redditLike.moderator.sessions.index(
      moderatorConnection,
      {
        body: {
          ip: ip2,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeGuestSession.IRequest,
      },
    );
  typia.assert(filteredByIp2);
  // 6. Validate ip2 results
  TestValidator.equals("filter ip2 count", filteredByIp2.data.length, 2);
  filteredByIp2.data.forEach((session) => {
    TestValidator.equals("IP matches filter ip2", session.ip, ip2);
  });
  // 7. Validate no cross-contamination
  const allSessionCount = filteredByIp1.data.length + filteredByIp2.data.length;
  TestValidator.equals("total matches", allSessionCount, 5);
}
