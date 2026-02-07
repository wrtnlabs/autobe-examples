import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
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
import { generate_random_economic_board_administrator_sections_create } from "../../../generate/generate_random_economic_board_administrator_sections_create";
import { prepare_random_economic_board_section } from "../../../prepare/prepare_random_economic_board_section";

export async function test_api_comment_section_summary_empty_section(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // 2. Create a section with no comments
  const section =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Retrieve comment section summary for empty section
  const summary =
    await api.functional.economicBoard.administrator.reports.comments.section.index(
      adminConnection,
      {
        sectionId: section.id,
        body: typia.random<IEconomicBoardComment.IRequest>(),
      },
    );
  typia.assert(summary);
  // 4. Validate empty response with proper pagination metadata
  TestValidator.equals("data array is empty", summary.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    summary.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 1", summary.pagination.pages, 1);
  TestValidator.equals(
    "pagination current is 1",
    summary.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default",
    summary.pagination.limit,
    10,
  );
}
