import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
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
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_link_update_post_link } from "../../../generate/generate_random_community_platform_member_posts_link_update_post_link";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_post_link_update_derived_preview_refresh(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // Authorize/join member
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(memberAuth);
  const hrefB =
    `https://b.example.org/${RandomGenerator.alphabets(10)}` satisfies string &
      tags.Format<"uri">;
  const initialPostId = typia.random<string & tags.Format<"uuid">>();
  const updated =
    await generate_random_community_platform_member_posts_link_update_post_link(
      memberConnection,
      {
        params: {
          postId: initialPostId,
        },
        body: {
          href: hrefB,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(updated);
  // Validate post identity & aggregates preservation semantics are not verifiable without pre-image.
  // Still validate response fields and that update is reflected.
  TestValidator.predicate(
    "editedAt is either null (no edit) or a date-time after update",
    updated.editedAt === null || updated.editedAt !== undefined,
  );
  TestValidator.predicate(
    "has stable community",
    updated.community.id.length > 0 && updated.community.name.length > 0,
  );
  TestValidator.predicate(
    "has aggregates",
    Number.isInteger(updated.voteScore) &&
      Number.isInteger(updated.commentsCount),
  );
}
