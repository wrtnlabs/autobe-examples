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

export async function test_api_community_deletion_by_owner_with_icon(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connection for member (owner)
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate member
  await authorize_member_join(memberConnection, {});
  // 2. Upload icon attachment for the community
  const icon = await generate_random_reddit_like_member_attachments_create(
    memberConnection,
    {
      body: {
        fileUri: "file://test-icon.png",
        originalFilename: "community-icon.png",
      } satisfies IRedditLikeAttachment.ICreate,
    },
  );
  typia.assert(icon);
  // 3. Create community with the uploaded icon
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        iconAttachmentId: icon.id,
      } satisfies DeepPartial<IRedditLikeCommunity.ICreate>,
    },
  );
  typia.assert(community);
  // Verify community was created with icon before deletion
  TestValidator.predicate("community has icon", community.icon !== null);
  TestValidator.equals(
    "icon attachment ID matches",
    community.icon?.id,
    icon.id,
  );
  // 4. Delete the community as owner
  await api.functional.redditLike.member.communities.erase(memberConnection, {
    communityId: community.id,
  });
  // 5. Verify deletion completed successfully (returns void, so success means no error thrown)
  // The successful completion validates owner authority to delete their community with icon
}
