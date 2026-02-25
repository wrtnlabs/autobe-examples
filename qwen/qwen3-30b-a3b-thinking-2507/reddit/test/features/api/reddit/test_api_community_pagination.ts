import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunity";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_pagination(
  connection: api.IConnection,
): Promise<void> {
  const output = await api.functional.reddit.communities.index(connection, {
    body: {
      page: 1,
      limit: 10,
    } satisfies IRedditCommunity.IRequest,
  });
  typia.assert(output);
  TestValidator.equals("data list size", output.data.length, 10);
  TestValidator.equals("current page", output.pagination.current, 1);
  TestValidator.equals("limit", output.pagination.limit, 10);
  TestValidator.predicate("records count", output.pagination.records >= 10);
  TestValidator.predicate("pages count", output.pagination.pages >= 1);
}
