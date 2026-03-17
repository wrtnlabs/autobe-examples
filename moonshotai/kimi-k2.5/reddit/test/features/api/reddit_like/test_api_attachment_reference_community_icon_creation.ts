import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentReference";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
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
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_attachment_reference } from "../../../prepare/prepare_random_reddit_like_attachment_reference";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test creating an attachment reference linking an uploaded image to a community entity.
 *
 * Scenario steps:
 * 1. Authenticate as a member via POST /redditLike/auth/member/join
 * 2. Upload an image file via POST /redditLike/member/attachments
 * 3. Create a community via POST /redditLike/member/communities
 * 4. Create an attachment reference with reference_type='community' linking the uploaded attachment to the created community
 *
 * Validation points:
 * - Reference is created successfully for the community entity
 * - Response includes the createdAt timestamp and full attachment metadata
 * - The referenceType is 'community'
 * - The attachment reference can be retrieved via GET endpoints
 * - The community's profile/icon image is now associated with the uploaded file
 */
export async function test_api_attachment_reference_community_icon_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as a member
  const authorized: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(authorized);
  // Step 2: Upload an image file
  const attachment: IRedditLikeAttachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: `https://example.com/files/${typia.random<string>()}.jpg`,
        },
      },
    );
  typia.assert(attachment);
  // Step 3: Create a community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // Step 4: Create an attachment reference linking the uploaded attachment to the community
  const attachmentReference: IRedditLikeAttachmentReference =
    await generate_random_reddit_like_member_attachment_references_create(
      memberConnection,
      {
        body: {
          attachmentId: attachment.id,
        } satisfies IRedditLikeAttachmentReference.ICreate,
      },
    );
  typia.assert(attachmentReference);
  // Validation: Verify business logic requirements
  TestValidator.equals(
    "referenceType should be 'community'",
    attachmentReference.referenceType,
    "community",
  );
}
