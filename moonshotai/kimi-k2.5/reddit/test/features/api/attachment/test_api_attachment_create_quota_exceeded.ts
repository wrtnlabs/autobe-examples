import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";

/**
 * Test the storage quota exceeded edge case when member attempts to upload an attachment.
 * An authenticated member whose current storage usage is at or near their allocated quota
 * attempts to upload a file that would exceed the quota. The system SHALL reject the request
 * with a storage limit error response instead of creating the attachment.
 */
export async function test_api_attachment_create_quota_exceeded(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as member
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // Fill storage by creating multiple attachments to reach quota
  const attachments = await ArrayUtil.asyncRepeat(50, async () => {
    const attachment =
      await generate_random_reddit_like_member_attachments_create(
        memberConnection,
        {
          body: {
            fileUri: typia.random<string & tags.Format<"uri">>(),
            originalFilename: RandomGenerator.name() + ".jpg",
          } satisfies IRedditLikeAttachment.ICreate,
        },
      );
    return attachment;
  });
  typia.assert(attachments);
  // Attempt to create attachment when quota is exceeded should fail
  await TestValidator.error(
    "should reject attachment creation when storage quota exceeded",
    async () => {
      await generate_random_reddit_like_member_attachments_create(
        memberConnection,
        {
          body: {
            fileUri: typia.random<string & tags.Format<"uri">>(),
            originalFilename: RandomGenerator.name() + ".jpg",
          } satisfies IRedditLikeAttachment.ICreate,
        },
      );
    },
  );
}
