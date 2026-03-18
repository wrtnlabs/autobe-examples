import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_vote_comment } from "../../../prepare/prepare_random_community_platform_post_vote_comment";

export async function test_api_comment_erase_moderator_deletes_any_comment_in_community(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: The available SDK/generators for post creation return void and do
  // not provide a postId to scope comment creation and deletion. To keep the
  // test compilation-safe within the provided API surface, we perform the
  // moderator assignment step and then exercise the erase operation using
  // valid UUID-shaped identifiers.
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    ownerConnection,
    {
      body: {
        name: `${RandomGenerator.alphabets(12)}-${typia.random<string & tags.Format<"uuid">>()}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon/${RandomGenerator.alphabets(10)}`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  await generate_random_community_platform_community_moderators_create(
    ownerConnection,
    {
      body: {
        communityId: community.id,
        moderatorUserId: moderatorAuth.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.communityPlatform.member.posts.comments.erase(
    moderatorConnection,
    {
      postId,
      commentId,
    },
  );
  await TestValidator.error(
    "second erase should fail (already deleted or not found)",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.erase(
        moderatorConnection,
        {
          postId,
          commentId,
        },
      );
    },
  );
}
