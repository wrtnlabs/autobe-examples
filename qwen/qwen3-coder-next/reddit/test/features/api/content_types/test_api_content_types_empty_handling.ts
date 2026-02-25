import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerationReportContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReportContentType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_content_types_empty_handling(
  connection: api.IConnection,
): Promise<void> {
  // This endpoint retrieves a single content type, not an array
  // Test that the endpoint returns a valid content type object
  const contentType =
    await api.functional.redditClone.content_types.at(connection);
  typia.assert(contentType);
  // Validate the response structure matches the expected type
  TestValidator.predicate(
    "content type is an object",
    typeof contentType === "object" && contentType !== null,
  );
  TestValidator.predicate(
    "content type has valid id",
    typeof contentType.id === "string",
  );
  TestValidator.predicate(
    "content type has valid code",
    typeof contentType.code === "string",
  );
  TestValidator.predicate(
    "content type has valid name",
    typeof contentType.name === "string",
  );
  // Validate that description can be string or null
  TestValidator.predicate(
    "content type description is valid",
    contentType.description === null ||
      typeof contentType.description === "string",
  );
}
