import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
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
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_create_with_icon_attachment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to obtain JWT tokens
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Upload an image attachment to be referenced as community icon
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  typia.assert(attachment);
  // 3. Create community referencing the uploaded attachment
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        iconAttachmentId: attachment.id,
      },
    },
  );
  typia.assert(community);
  // 4. Validate that the icon is properly associated with the community
  TestValidator.notEquals("icon should not be null", community.icon, null);
  TestValidator.equals(
    "icon id matches attachment id",
    community.icon?.id,
    attachment.id,
  );
  TestValidator.equals(
    "icon originalFilename matches",
    community.icon?.originalFilename,
    attachment.originalFilename,
  );
  TestValidator.equals(
    "icon mimeType matches",
    community.icon?.mimeType,
    attachment.mimeType,
  );
  TestValidator.equals(
    "icon fileSizeBytes matches",
    community.icon?.fileSizeBytes,
    attachment.fileSizeBytes,
  );
  TestValidator.equals(
    "icon uploader matches member",
    community.icon?.uploadedByMember.id,
    attachment.uploader.id,
  );
}
