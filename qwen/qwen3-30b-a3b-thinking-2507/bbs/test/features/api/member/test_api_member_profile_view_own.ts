import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticle";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_econ_politic_board_member_articles_create } from "../../../generate/generate_random_econ_politic_board_member_articles_create";
import { prepare_random_econ_politic_board_article } from "../../../prepare/prepare_random_econ_politic_board_article";

export async function test_api_member_profile_view_own(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account using authorization function
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IEconPoliticBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {},
    });
  // Step 2: Record initial state of article count
  const initialArticleCount = member.article_count;
  // Step 3: Create article to establish member profile
  await generate_random_econ_politic_board_member_articles_create(
    memberConnection,
    {},
  );
  // Step 4: Retrieve member profile to validate profile counts
  const profile: IEconPoliticBoardMember =
    await api.functional.econPoliticBoard.members.at(memberConnection, {
      memberId: member.id,
    });
  // Step 5: Validate profile data
  typia.assert(profile);
  TestValidator.equals("profile id matches member", profile.id, member.id);
  TestValidator.equals(
    "profile article count incremented by 1",
    profile.article_count,
    initialArticleCount + 1,
  );
  TestValidator.equals(
    "profile comment count matches member",
    profile.comment_count,
    member.comment_count,
  );
}
