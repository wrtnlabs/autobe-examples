import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_reported_content_erase_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Prepare a base connection from the given one
  const baseConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID to use as the reported content ID to erase
  const fakeReportedContentId = typia.random<string & tags.Format<"uuid">>();
  // Expect the erase API call without any authorization to fail with HTTP 401 Unauthorized
  await TestValidator.httpError(
    "unauthorized deletion attempt should be rejected",
    401,
    async () => {
      // Directly call the erase function from SDK with the base connection (unauthenticated)
      await api.functional.communityPlatform.reportedContents.erase(
        baseConnection,
        {
          id: fakeReportedContentId,
        },
      );
    },
  );
}
