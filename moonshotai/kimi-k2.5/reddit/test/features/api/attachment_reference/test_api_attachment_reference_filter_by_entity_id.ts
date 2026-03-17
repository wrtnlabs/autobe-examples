import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAttachmentReference";
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
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_attachment_reference_filter_by_entity_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate to create a community
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community to get a valid community_id for the filter test
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Call attachment-references endpoint with reference_type='community' and community_id
  const response = await api.functional.redditLike.attachment_references.index(
    connection,
    {
      body: {
        reference_type: "community",
        community_id: community.id,
      } satisfies IRedditLikeAttachmentReference.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate each returned reference has correct polymorphic subtype structure
  for (const ref of response.data) {
    TestValidator.equals(
      "referenceType is community",
      ref.referenceType,
      "community",
    );
    TestValidator.equals("profileId is null", ref.profileId, null);
    TestValidator.equals("postId is null", ref.postId, null);
    // Validate communityId matches the filter if present (type-aware validation)
    if (ref.communityId !== null) {
      TestValidator.equals(
        "communityId matches filter",
        ref.communityId,
        community.id,
      );
    }
  }
}
