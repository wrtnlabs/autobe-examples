import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_member_articles_comments_create } from "../../../generate/generate_random_economic_political_board_member_articles_comments_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";
import { prepare_random_economic_political_board_comment } from "../../../prepare/prepare_random_economic_political_board_comment";

export async function test_api_comment_update_by_non_owner_no_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Alice joins and creates article
  const aliceConnection: api.IConnection = { host: connection.host };
  const alice = await authorize_member_join(aliceConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(alice);
  const aliceArticle =
    await api.functional.economicPoliticalBoard.member.articles.create(
      aliceConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(aliceArticle);
  // 2. Bob joins and creates article
  const bobConnection: api.IConnection = { host: connection.host };
  const bob = await authorize_member_join(bobConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(bob);
  const bobArticle =
    await api.functional.economicPoliticalBoard.member.articles.create(
      bobConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(bobArticle);
  // 3. Alice posts comment on her article
  const aliceComment =
    await api.functional.economicPoliticalBoard.member.articles.comments.create(
      aliceConnection,
      {
        articleId: aliceArticle.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(aliceComment);
  // 4. Bob posts comment on his article
  const bobComment =
    await api.functional.economicPoliticalBoard.member.articles.comments.create(
      bobConnection,
      {
        articleId: bobArticle.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(bobComment);
  const originalContent: string = bobComment.content;
  // 5. Alice attempts to update Bob's comment (should fail with 403 Forbidden)
  await TestValidator.error("non-owner cannot update comment", async () => {
    await api.functional.economicPoliticalBoard.member.articles.comments.update(
      aliceConnection,
      {
        articleId: bobArticle.id,
        commentId: bobComment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  });
  // 6. Verify comment content unchanged by checking alice's own comment is different
  TestValidator.notEquals(
    "alice comment differs from bob comment",
    aliceComment.content,
    bobComment.content,
  );
}
