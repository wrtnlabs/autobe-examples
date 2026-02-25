import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerationReportContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReportContentType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_content_types_multiple(
  connection: api.IConnection,
): Promise<void> {
  const contentTypes =
    await api.functional.redditClone.content_types.at(connection);
  typia.assert(contentTypes);
}
