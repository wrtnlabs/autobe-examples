import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_attachment_retrieve_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that is guaranteed not to exist
  const nonExistentAttachmentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve a non-existent attachment and verify it returns 404
  await TestValidator.httpError(
    "should return 404 for non-existent attachment",
    404,
    async () => {
      await api.functional.redditLike.attachments.at(connection, {
        attachmentId: nonExistentAttachmentId,
      });
    },
  );
}
