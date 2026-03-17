import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentReference";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_attachment_reference_retrieve_not_found(
  connection: api.IConnection,
) {
  // Generate a random UUID that does not exist in the system
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent attachment reference
  // This should throw an HttpError with status 404
  await TestValidator.httpError(
    "should return 404 for non-existent attachment reference",
    404,
    async () => {
      await api.functional.redditLike.attachment_references.at(connection, {
        referenceId: nonExistentId,
      });
    },
  );
}
