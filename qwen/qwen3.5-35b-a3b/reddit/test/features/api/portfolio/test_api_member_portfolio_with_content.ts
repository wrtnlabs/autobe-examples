import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_portfolio_with_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityMember.IJoin,
    });
  typia.assert(member);
  // 2. Execute: Retrieve portfolio (public endpoint, no auth required)
  const portfolioConnection: api.IConnection = { host: connection.host };
  const portfolio: IRedditCommunityMember.IPortfolio =
    await api.functional.redditCommunity.member.members.portfolio.at(
      portfolioConnection,
      {
        memberId: member.id,
      },
    );
  typia.assert(portfolio);
  // 3. Validate Response
  TestValidator.equals("portfolio id matches", portfolio.id, member.id);
  TestValidator.equals(
    "portfolio username matches",
    portfolio.username,
    member.username,
  );
  TestValidator.predicate("karmaScore is valid", portfolio.karmaScore >= 0);
  TestValidator.equals("posts is array", Array.isArray(portfolio.posts), true);
  TestValidator.equals(
    "comments is array",
    Array.isArray(portfolio.comments),
    true,
  );
}
