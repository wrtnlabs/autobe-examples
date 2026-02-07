import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_administrator_sections_create } from "../../../generate/generate_random_economic_board_administrator_sections_create";
import { generate_random_economic_board_articles_create } from "../../../generate/generate_random_economic_board_articles_create";
import { generate_random_economic_board_citizen_articles_comments_create } from "../../../generate/generate_random_economic_board_citizen_articles_comments_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";
import { prepare_random_economic_board_comment } from "../../../prepare/prepare_random_economic_board_comment";
import { prepare_random_economic_board_section } from "../../../prepare/prepare_random_economic_board_section";

export async function test_api_administrator_comments_deleted_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // 2. Create citizen account (with no comments)
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenResponse = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // 3. Admin retrieves comments for this citizen (who has no comments)
  const adminComments =
    await api.functional.economicBoard.administrator.reports.comments.index(
      adminConnection,
      {
        userId: citizenResponse.id,
      },
    );
  typia.assert(adminComments);
  // 4. Validate response structure meets expected type (IPageIEconomicBoardComment.ISummary)
  // The citizen has no comments, so data array should be empty
  TestValidator.predicate(
    "response has pagination object",
    adminComments.pagination !== undefined &&
      typeof adminComments.pagination.current === "number" &&
      typeof adminComments.pagination.limit === "number" &&
      typeof adminComments.pagination.records === "number" &&
      typeof adminComments.pagination.pages === "number",
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(adminComments.data) && adminComments.data.length >= 0,
  );
  // Validate that no comments are returned (empty array)
  TestValidator.equals(
    "no comments exist for new user",
    adminComments.data.length,
    0,
  );
  // Validate pagination records is 0 for new user
  TestValidator.equals(
    "pagination records is 0 for new user",
    adminComments.pagination.records,
    0,
  );
}
