import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerationReportContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReportContentType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_content_types_list(
  connection: api.IConnection,
): Promise<void> {
  const contentType =
    await api.functional.redditClone.content_types.at(connection);
  typia.assert<IRedditCloneModerationReportContentType>(contentType);
  // Validate response structure
  TestValidator.predicate(
    "should return content type object",
    contentType !== null,
  );
  // Validate required fields
  TestValidator.predicate("has valid id", typeof contentType.id === "string");
  TestValidator.predicate(
    "has valid code",
    typeof contentType.code === "string",
  );
  TestValidator.predicate(
    "has valid name",
    typeof contentType.name === "string",
  );
  TestValidator.predicate(
    "has valid description (string or null)",
    contentType.description === null ||
      typeof contentType.description === "string",
  );
}
