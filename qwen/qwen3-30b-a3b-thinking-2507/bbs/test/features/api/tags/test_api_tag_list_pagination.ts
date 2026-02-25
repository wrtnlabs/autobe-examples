import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  const output =
    await api.functional.economicPoliticalDiscussionBoard.tags.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(output);
  TestValidator.equals("data length", output.data.length, 10);
  TestValidator.equals("current page", output.pagination.current, 2);
  TestValidator.equals("limit", output.pagination.limit, 10);
  TestValidator.equals("total records", output.pagination.records, 25);
  TestValidator.equals("pages", output.pagination.pages, 3);
}
