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

export async function test_api_attachment_reference_deletion_unauthorized_other_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, { body: {} });
  // Step 2: Upload an attachment as Member A
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberAConnection,
      { body: {} },
    );
  typia.assert(attachment);
  // Step 3: Create an attachment reference as Member A
  const reference =
    await generate_random_reddit_like_member_attachment_references_create(
      memberAConnection,
      {
        body: {
          attachmentId: attachment.id,
        },
      },
    );
  typia.assert(reference);
  // Step 4: Authenticate as Member B with different credentials
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, { body: {} });
  // Step 5: Verify Member B cannot delete Member A's reference (should get 403 Forbidden)
  await TestValidator.httpError(
    "Member B should not be able to delete Member A's attachment reference",
    403,
    async () => {
      await api.functional.redditLike.member.attachment_references.erase(
        memberBConnection,
        {
          referenceId: reference.id,
        },
      );
    },
  );
  // Step 6: Verify the attachment reference still exists by having Member A successfully delete it
  await api.functional.redditLike.member.attachment_references.erase(
    memberAConnection,
    {
      referenceId: reference.id,
    },
  );
}
