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

export async function test_api_tag_list_search_fuzzy_matching(
  connection: api.IConnection,
): Promise<void> {
  const output =
    await api.functional.economicPoliticalDiscussionBoard.tags.index(
      connection,
      {
        body: {
          search: "eco",
          sort: "newest",
        },
      },
    );
  typia.assert(output);
  // Verify tag names contain 'economics' and 'ecofriendly' (case-insensitive)
  TestValidator.predicate("Search results include tag with economics", () =>
    output.data.some((tag) => tag.name.toLowerCase().includes("economics")),
  );
  TestValidator.predicate("Search results include tag with ecofriendly", () =>
    output.data.some((tag) => tag.name.toLowerCase().includes("ecofriendly")),
  );
  // Verify sort order: latest tags first
  const expected = [...output.data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.index("tag list sorted by newest", expected, output.data);
}
