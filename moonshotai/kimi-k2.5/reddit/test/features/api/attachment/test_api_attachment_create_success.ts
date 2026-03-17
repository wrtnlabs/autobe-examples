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
 * Test the primary success path of member uploading a new image attachment.
 * A member authenticates by joining, then uploads an image file providing
 * fileUri and originalFilename in request body. The system validates storage
 * quota is not exceeded, processes the file through infrastructure layer,
 * generates storage path and SHA-256 checksum, creates an attachment record
 * associated with the uploading member, and returns complete attachment
 * metadata. Validates that all metadata fields are correctly populated and
 * the attachment is properly associated with the member.
 */
export async function test_api_attachment_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member connection with JWT authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1).replace(/\s+/g, ""),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member);
  // Upload an image attachment
  const attachmentInput: IRedditLikeAttachment.ICreate = {
    fileUri: "https://example.com/test-image.png",
    originalFilename: "test-image.png",
  };
  const attachment = await api.functional.redditLike.member.attachments.create(
    memberConnection,
    {
      body: attachmentInput,
    },
  );
  typia.assert(attachment);
  // Validate attachment is properly associated with the uploading member
  TestValidator.equals(
    "uploader id matches member",
    attachment.uploader.id,
    member.id,
  );
  TestValidator.equals(
    "uploader email matches member",
    attachment.uploader.email,
    member.email,
  );
  TestValidator.equals(
    "uploader username matches member",
    attachment.uploader.username,
    member.username,
  );
  // Validate original filename is preserved
  TestValidator.equals(
    "original filename preserved",
    attachment.originalFilename,
    attachmentInput.originalFilename,
  );
}
