import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticle";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import type { IEconPoliticBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_econ_politic_board_admin_sections_create } from "../../../generate/generate_random_econ_politic_board_admin_sections_create";
import { generate_random_econ_politic_board_member_articles_create } from "../../../generate/generate_random_econ_politic_board_member_articles_create";
import { prepare_random_econ_politic_board_article } from "../../../prepare/prepare_random_econ_politic_board_article";
import { prepare_random_econ_politic_board_section } from "../../../prepare/prepare_random_econ_politic_board_section";

export async function test_api_admin_member_profile_view_other(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for profile viewing permissions
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // 2. Create section for article creation
  const section =
    await generate_random_econ_politic_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  // 3. Create member account for profile being viewed
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  // 4. Create article for the member to establish their profile
  await generate_random_econ_politic_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        sectionId: section.id,
      },
    },
  );
  // 5. Admin views the member's profile
  const profile = await api.functional.econPoliticBoard.members.at(
    adminConnection,
    {
      memberId: member.id,
    },
  );
  typia.assert(profile);
  // Verify that the profile information matches expectations
  TestValidator.equals(
    "profile ID must match member ID",
    profile.id,
    member.id,
  );
  TestValidator.equals("article count should be 1", profile.article_count, 1);
}
