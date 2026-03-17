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

/**
 * Test creating an attachment reference linking a profile image to the authenticated member's profile.
 */
export async function test_api_attachment_reference_profile_avatar_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Upload an image attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: "https://example.com/test-image.png",
          originalFilename: "profile-avatar.png",
        } satisfies Partial<IRedditLikeAttachment.ICreate>,
      },
    );
  typia.assert(attachment);
  // 3. Create attachment reference linking the uploaded attachment to profile
  const reference =
    await generate_random_reddit_like_member_attachment_references_create(
      memberConnection,
      {
        body: {
          attachmentId: attachment.id,
        } satisfies Partial<IRedditLikeAttachmentReference.ICreate>,
      },
    );
  typia.assert(reference);
  // 4. Validate response fields
  TestValidator.equals(
    "referenceType is profile",
    reference.referenceType,
    "profile",
  );
  TestValidator.equals(
    "attachment ID matches",
    reference.attachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "attachment uploader ID matches",
    reference.attachment.uploader.id,
    authorized.id,
  );
  // 5. Validate duplicate reference creation is rejected
  await TestValidator.error(
    "duplicate reference creation should be rejected",
    async () => {
      await generate_random_reddit_like_member_attachment_references_create(
        memberConnection,
        {
          body: {
            attachmentId: attachment.id,
          } satisfies Partial<IRedditLikeAttachmentReference.ICreate>,
        },
      );
    },
  );
}
