import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
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
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { generate_random_economic_political_board_member_articles_comments_create } from "../../../generate/generate_random_economic_political_board_member_articles_comments_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";
import { prepare_random_economic_political_board_comment } from "../../../prepare/prepare_random_economic_political_board_comment";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

export async function test_api_member_comment_delete_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      displayName: "Admin",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // Create a section for article organization
  const section =
    await generate_random_economic_political_board_admin_sections_create(
      adminLoginConnection,
      {
        body: {
          name: "Test Section",
          description: "Section for testing comment deletion",
        },
      },
    );
  typia.assert(section);
  // 2. Member1 setup - join and login
  const member1JoinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1JoinConnection, {
    body: {
      email: "member1@test.com",
      password: "1234",
      name: "Member One",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  const member1LoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(member1LoginConnection, {
    body: {
      email: "member1@test.com",
      password: "1234",
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  // Member1 creates an article
  const article =
    await generate_random_economic_political_board_member_articles_create(
      member1LoginConnection,
      {
        body: {
          title: "Test Article",
          content: "Test content",
          sectionId: section.id,
        },
      },
    );
  typia.assert(article);
  // Member1 creates a comment on the article
  const comment =
    await generate_random_economic_political_board_member_articles_comments_create(
      member1LoginConnection,
      {
        body: {
          content: "Test comment by member1",
        },
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 3. Member2 setup - join and login
  const member2JoinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2JoinConnection, {
    body: {
      email: "member2@test.com",
      password: "1234",
      name: "Member Two",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  const member2LoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(member2LoginConnection, {
    body: {
      email: "member2@test.com",
      password: "1234",
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  // 4. Member2 attempts to delete Member1's comment (should fail with 403)
  await TestValidator.error("non-owner cannot delete comment", async () => {
    await api.functional.economicPoliticalBoard.member.articles.comments.erase(
      member2LoginConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  });
  // 5. Verify comment still exists by checking article comment_count
  // Note: Comment count should be unchanged (still has 1 comment)
  TestValidator.equals(
    "comment count unchanged after failed deletion",
    article.comment_count,
    1,
  );
}
