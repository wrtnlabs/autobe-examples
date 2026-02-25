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

export async function test_api_tag_list_sorting_oldest(
  connection: api.IConnection,
): Promise<void> {
  const response =
    await api.functional.economicPoliticalDiscussionBoard.tags.index(
      connection,
      {
        body: {
          sort: "oldest",
        },
      },
    );
  typia.assert(response);
  const expected = [...response.data].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  TestValidator.index(
    "Verifying tag list sorted in ascending chronological order by 'oldest'",
    expected,
    response.data,
    true,
  );
}
