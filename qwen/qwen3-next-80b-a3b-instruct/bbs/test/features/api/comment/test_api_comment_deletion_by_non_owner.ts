import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_citizen_articles_comments_create } from "../../../generate/generate_random_economic_board_citizen_articles_comments_create";
import { prepare_random_economic_board_comment } from "../../../prepare/prepare_random_economic_board_comment";

export async function test_api_comment_deletion_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two citizen users: one as owner, one as non-owner
  const citizenAConnection: api.IConnection = { host: connection.host };
  const citizenA = await authorize_citizen_join(citizenAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizenA);
  const citizenBConnection: api.IConnection = { host: connection.host };
  const citizenB = await authorize_citizen_join(citizenBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizenB);
  // 2. Create an article ID (assume it exists or will be created by the system when comment is posted)
  // Since no API exists to create article, we use a generated UUID
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Have citizenB create a comment on that article (so citizenB is the author)
  const commentByCitizenB =
    await api.functional.economicBoard.citizen.articles.comments.create(
      citizenBConnection,
      {
        articleId,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
          }),
        } satisfies IEconomicBoardComment.ICreate,
      },
    );
  typia.assert(commentByCitizenB);
  const originalCommentId = commentByCitizenB.id;
  // 4. Try to delete citizenB's comment using citizenA's connection (non-owner attempt)
  // This should fail with 403 Forbidden
  await TestValidator.error(
    "should return 403 Forbidden when non-owner tries to delete comment",
    async () => {
      await api.functional.economicBoard.citizen.comments.erase(
        citizenAConnection,
        {
          commentId: originalCommentId,
        },
      );
    },
  );
  // Note: Cannot verify comment still exists because no GET comment endpoint is provided.
}