import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentReference";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_attachment_references_create } from "../../../generate/generate_random_reddit_like_member_attachment_references_create";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_attachment_reference } from "../../../prepare/prepare_random_reddit_like_attachment_reference";

export async function test_api_attachment_reference_deletion_not_found_or_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as member
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Upload attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: typia.random<string & tags.Format<"uri">>(),
          originalFilename: RandomGenerator.name(),
        },
      },
    );
  typia.assert(attachment);
  // 3. Create attachment reference
  const reference =
    await generate_random_reddit_like_member_attachment_references_create(
      memberConnection,
      { body: { attachmentId: attachment.id } },
    );
  typia.assert(reference);
  // 4. First deletion - should succeed
  await api.functional.redditLike.member.attachment_references.erase(
    memberConnection,
    {
      referenceId: reference.id,
    },
  );
  // 5. Attempt duplicate deletion - should fail with 404 or 409
  await TestValidator.httpError(
    "duplicate deletion should return 404 or 409",
    [404, 409],
    async () => {
      await api.functional.redditLike.member.attachment_references.erase(
        memberConnection,
        {
          referenceId: reference.id,
        },
      );
    },
  );
  // 6. Attempt deletion of non-existent reference - should fail with 404
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent reference deletion should return 404",
    404,
    async () => {
      await api.functional.redditLike.member.attachment_references.erase(
        memberConnection,
        {
          referenceId: nonExistentId,
        },
      );
    },
  );
}
