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

export async function test_api_attachment_reference_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Upload a file attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  typia.assert(attachment);
  // 3. Create an attachment reference linking the attachment
  const reference =
    await generate_random_reddit_like_member_attachment_references_create(
      memberConnection,
      {
        body: {
          attachmentId: attachment.id,
        } satisfies IRedditLikeAttachmentReference.ICreate,
      },
    );
  typia.assert(reference);
  // 4. Delete the attachment reference (owner deletes their own reference)
  // The erase endpoint returns void on success
  await api.functional.redditLike.member.attachment_references.erase(
    memberConnection,
    {
      referenceId: reference.id,
    },
  );
  // 5. Deletion successful if no error thrown
  // The operation validates that:
  // - The reference exists
  // - The authenticated member is the owner
  // - Cascading delete removes both reference and attachment
}
