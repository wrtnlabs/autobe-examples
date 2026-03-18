import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_link_update_post_link } from "../../../generate/generate_random_community_platform_member_posts_link_update_post_link";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_post_link_metadata_soft_deleted_not_exposed(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const firstHref = typia.random<string & tags.Format<"uri">>();
  const secondHref = typia.random<string & tags.Format<"uri">>();
  // Use link update generator to obtain a concrete post id that exists for this member
  const updatedAfterFirst: ICommunityPlatformPost =
    await generate_random_community_platform_member_posts_link_update_post_link(
      memberConnection,
      {
        params: {
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          href: firstHref,
          displayTitle: RandomGenerator.paragraph({ sentences: 1 }),
          displayDescription: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(updatedAfterFirst);
  const updatedAfterSecond: ICommunityPlatformPost =
    await generate_random_community_platform_member_posts_link_update_post_link(
      memberConnection,
      {
        params: {
          postId: updatedAfterFirst.id,
        },
        body: {
          href: secondHref,
          displayTitle: RandomGenerator.paragraph({ sentences: 1 }),
          displayDescription: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(updatedAfterSecond);
  const link = await api.functional.communityPlatform.member.posts.link.at(
    memberConnection,
    {
      postId: updatedAfterSecond.id,
    },
  );
  typia.assert(link);
  TestValidator.equals(
    "href should match latest active metadata",
    link.href,
    secondHref,
  );
  TestValidator.equals(
    "deleted_at should be null for active link metadata",
    link.deleted_at,
    null,
  );
}
